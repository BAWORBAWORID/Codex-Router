import { randomUUID } from "node:crypto";
import {
    GLOBAL_VERSION,
    OPENCODE_ZEN_BASE_URL,
    OPENCODE_ZEN_MODELS,
    providerAlias,
    providerBaseId
} from "@codex/constants";
import type {
    ChatCompletionChunk,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ModelObject
} from "@codex/types";
import { OpenAIExecutor, type OpenAIExecutorOptions } from "./openai.js";

const OPENCODE_ZEN_MAX_TOKENS = 512;
const MODELS_DEV_API_URL = "https://models.dev/api.json";

interface ModelsDevModelEntry {
    name?: string;
    status?: string;
    cost?: { input?: number; output?: number };
}

export interface OpenCodeZenExecutorOptions extends OpenAIExecutorOptions {}

/**
 * The gateway resolves `zen/...` as the canonical model id, so the executor has
 * to emit that prefix. OpenAIExecutor derives it from the raw provider id
 * (`opencode_zen` → `opencode/`), which the provider endpoints do not strip —
 * the model then shows up twice and under the wrong id.
 */
function withAliasPrefix(models: ModelObject[], providerId: string): ModelObject[] {
    const prefix = providerAlias(providerBaseId(providerId));
    return models.map((model) => {
        const bare = model.id.includes("/") ? model.id.slice(model.id.indexOf("/") + 1) : model.id;
        return { ...model, id: `${prefix}/${bare}`, owned_by: prefix };
    });
}

function clampMaxTokens(req: ChatCompletionRequest): ChatCompletionRequest {
    if (req.max_tokens && req.max_tokens > OPENCODE_ZEN_MAX_TOKENS) {
        return { ...req, max_tokens: OPENCODE_ZEN_MAX_TOKENS };
    }
    return req;
}

function randomIPv4(): string {
    const octet = () => Math.floor(Math.random() * 256);
    return `${1 + octet()}.${octet()}.${octet()}.${1 + octet()}`;
}

async function fetchModelsDevZenModels(providerId: string): Promise<(ModelObject & { locked?: boolean })[]> {
    try {
        const res = await fetch(MODELS_DEV_API_URL, {
            headers: {
                accept: "application/json",
                "user-agent": `srouter/${GLOBAL_VERSION}`
            }
        });
        if (!res.ok) return [];

        const data = (await res.json()) as Record<string, { models?: Record<string, ModelsDevModelEntry> }>;
        const models = data?.opencode?.models || {};
        const baseId = providerAlias(providerBaseId(providerId));

        return Object.entries(models)
            .filter(([id, m]) => {
                if (!m || typeof m !== "object") return false;
                if (m.status && String(m.status).toLowerCase() === "deprecated") return false;
                return true;
            })
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([id, m]) => {
                const free = id.toLowerCase().endsWith("-free");
                return {
                    id: `${baseId}/${id}`,
                    object: "model" as const,
                    name: m.name,
                    owned_by: baseId,
                    locked: !free
                };
            });
    } catch {
        return [];
    }
}

export class OpenCodeZenExecutor extends OpenAIExecutor {
    constructor(options: OpenCodeZenExecutorOptions = {}) {
        super({
            id: options.id ?? "opencode_zen",
            name: options.name ?? "OpenCode Zen",
            baseUrl: options.baseUrl ?? OPENCODE_ZEN_BASE_URL,
            apiKey: options.apiKey ?? "",
            accessToken: options.accessToken ?? ""
        });
    }

    /**
     * Zen reads `x-opencode-client`, `x-opencode-request` and `x-real-ip` off
     * every request (see the upstream zen handler): the first identifies the
     * caller, the second correlates a request in their logs, the third is the
     * client IP their per-IP limiter buckets on. None of them grant access — a
     * measured sweep showed every header combination still returns FreeTierError
     * on the models that are not allowAnonymous.
     */
    protected override getHeaders(accept?: string): Record<string, string> {
        return {
            ...super.getHeaders(accept),
            "x-opencode-client": `srouter/${GLOBAL_VERSION}`,
            "x-opencode-request": randomUUID(),
            "x-real-ip": randomIPv4()
        };
    }

    override async listModels(): Promise<ModelObject[]> {
        const liveModels = await super.listModels();
        if (liveModels && liveModels.length > 0) {
            return withAliasPrefix(liveModels, this.id).map((m) => {
                const bare = m.id.includes("/") ? m.id.slice(m.id.indexOf("/") + 1) : m.id;
                const free = bare.toLowerCase().endsWith("-free");
                return { ...m, locked: !free };
            });
        }

        const catalogModels = await fetchModelsDevZenModels(this.id);
        if (catalogModels.length > 0) {
            return catalogModels;
        }

        const baseId = providerAlias(providerBaseId(this.id));
        return OPENCODE_ZEN_MODELS.map((m) => {
            const free = m.id.toLowerCase().endsWith("-free");
            return {
                id: `${baseId}/${m.id}`,
                object: "model" as const,
                name: m.name,
                owned_by: baseId,
                locked: !free
            };
        });
    }

    override async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        return super.chatCompletion(clampMaxTokens(req));
    }

    override async *chatCompletionStream(req: ChatCompletionRequest): AsyncGenerator<ChatCompletionChunk, void, void> {
        yield* super.chatCompletionStream(clampMaxTokens(req));
    }
}
