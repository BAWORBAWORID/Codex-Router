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
            return withAliasPrefix(liveModels, this.id);
        }

        const baseId = providerAlias(providerBaseId(this.id));
        return OPENCODE_ZEN_MODELS.map((m) => ({
            id: `${baseId}/${m.id}`,
            object: "model",
            owned_by: baseId
        }));
    }

    override async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        return super.chatCompletion(clampMaxTokens(req));
    }

    override async *chatCompletionStream(req: ChatCompletionRequest): AsyncGenerator<ChatCompletionChunk, void, void> {
        yield* super.chatCompletionStream(clampMaxTokens(req));
    }
}
