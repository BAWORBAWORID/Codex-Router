import crypto from "node:crypto";
import { FREEPI_AUTH_BASE_URL, FREEPI_BASE_URL } from "@codex/constants";
import type {
    AIProvider,
    ChatCompletionChunk,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ModelObject
} from "@codex/types";
import { isToolCallingNotSupportedError } from "@codex/pricing";
import { parseDataLine, streamLines } from "./base.js";
import { fetchWithRetry } from "./retry.js";

const FREEPI_CLIENT_VERSION = "0.6.23";

export interface FreePiExecutorOptions {
    id?: string;
    name?: string;
    baseUrl?: string;
    apiKey?: string;
    accessToken?: string;
    sessionId?: string;
}

function stripProviderPrefix(model: string): string {
    const slash = model.indexOf("/");
    return slash >= 0 ? model.slice(slash + 1) : model;
}

function stripToolsFromRequest(req: ChatCompletionRequest): ChatCompletionRequest {
    const stripped = { ...req } as ChatCompletionRequest & Record<string, unknown>;
    delete stripped.tools;
    delete stripped.tool_choice;
    return stripped as ChatCompletionRequest;
}

export class FreePiExecutor implements AIProvider {
    id: string;
    name: string;
    protected baseUrl: string;
    protected apiKey: string;
    protected accessToken: string;
    protected sessionId: string;

    constructor(options: FreePiExecutorOptions = {}) {
        this.id = options.id ?? "freepi";
        this.name = options.name ?? "FreePi";
        this.baseUrl = (options.baseUrl ?? FREEPI_BASE_URL).replace(/\/$/, "");
        this.apiKey = options.apiKey ?? "";
        this.accessToken = options.accessToken ?? "";
        this.sessionId = options.sessionId ?? crypto.randomUUID();
    }

    protected getHeaders(): Record<string, string> {
        const token = this.accessToken || this.apiKey;
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-client-version": FREEPI_CLIENT_VERSION,
            "x-session-id": this.sessionId,
            "User-Agent": "SRouter/1.0.0 (Node.js)"
        };
    }

    async listModels(): Promise<(ModelObject & { locked?: boolean })[]> {
        const LOCKED_IDS = new Set([
            "abliterated-large-flash",
            "abliterated-large-v2",
            "deepseek-v4.1-flash-1017-ultrafast",
            "deepseek-v4.1-flash-abliterated",
            "deepseek-v4-pro",
            "gemini-4-carbon",
            "gemini-4-hydrogen",
            "gemini-4-neon",
            "gemma-4-uncensored",
            "glm-4.7-flash-heretic",
            "gpt-6.2-astra",
            "kimi-k3.1-pro",
            "mimo-v2.6-flash",
            "qwen3.5-35b-darkbloom",
            "qwen3.6-plus-uncensored",
            "solar-pro-4",
            "uncensored-1.2"
        ]);
        try {
            const res = await fetch(`${FREEPI_AUTH_BASE_URL}/client-version`, {
                method: "GET",
                headers: { "User-Agent": "SRouter/1.0.0 (Node.js)" }
            });
            if (!res.ok) return [];
            const data = (await res.json()) as {
                models?: Array<{
                    id: string;
                    name?: string;
                    display_name?: string;
                    free?: boolean;
                    usage_x?: string | null;
                    note?: string | null;
                    section?: string | null;
                }>;
            };
            if (!Array.isArray(data.models)) return [];
            const now = Math.floor(Date.now() / 1000);
            return data.models.map((m) => {
                const id = m.id;
                const note = String(m.note || "").toLowerCase();
                const locked =
                    LOCKED_IDS.has(id) ||
                    note.includes("premium") ||
                    m.section === "defense";
                return {
                    id,
                    object: "model" as const,
                    created: now,
                    owned_by: "freepi",
                    name: m.display_name || m.name || id,
                    locked
                };
            });
        } catch {
            return [];
        }
    }

    async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        const targetModel = stripProviderPrefix(req.model);
        const url = `${this.baseUrl}/chat/completions`;
        const headers = this.getHeaders();
        const body = { ...req, model: targetModel, stream: false } as unknown as Record<string, unknown>;

        let res = await fetchWithRetry(url, body, headers);

        if (!res.ok) {
            const errorText = await res.text();
            if (isToolCallingNotSupportedError(errorText) && req.tools && req.tools.length > 0) {
                const strippedReq = stripToolsFromRequest({ ...req, model: targetModel, stream: false } as ChatCompletionRequest);
                res = await fetchWithRetry(url, strippedReq as unknown as Record<string, unknown>, headers, 1);
                if (!res.ok) {
                    const retryErrorText = await res.text();
                    throw new Error(`FreePi error (${res.status}): ${retryErrorText}`);
                }
                return (await res.json()) as ChatCompletionResponse;
            }
            throw new Error(`FreePi error (${res.status}): ${errorText}`);
        }

        return (await res.json()) as ChatCompletionResponse;
    }

    async *chatCompletionStream(
        req: ChatCompletionRequest
    ): AsyncGenerator<ChatCompletionChunk, void, void> {
        const targetModel = stripProviderPrefix(req.model);
        const url = `${this.baseUrl}/chat/completions`;
        const headers = this.getHeaders();
        const body = { ...req, model: targetModel, stream: true } as unknown as Record<string, unknown>;

        let res = await fetchWithRetry(url, body, headers);

        if (!res.ok || !res.body) {
            const errorText = await res.text().catch(() => "");
            if (isToolCallingNotSupportedError(errorText) && req.tools && req.tools.length > 0) {
                const strippedReq = stripToolsFromRequest({ ...req, model: targetModel, stream: true } as ChatCompletionRequest);
                yield* this.chatCompletionStream(strippedReq);
                return;
            }
            throw new Error(`FreePi stream error (${res.status}): ${errorText}`);
        }

        for await (const line of streamLines(res.body)) {
            const jsonStr = parseDataLine(line);
            if (jsonStr === null) continue;
            try {
                const parsed = JSON.parse(jsonStr) as ChatCompletionChunk;
                yield parsed;
            } catch {
                // ignore malformed JSON chunk
            }
        }
    }
}
