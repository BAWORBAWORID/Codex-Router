import {
    FREEBUFF_BASE_URL,
    FREEBUFF_MODELS,
    freebuffModelIdFromDisplayName
} from "@codex/constants";
import type {
    ChatCompletionChunk,
    ChatCompletionRequest,
    ChatCompletionResponse,
    ModelObject
} from "@codex/types";
import { OpenAIExecutor, type OpenAIExecutorOptions } from "./openai.js";
import { fetchWithRetry } from "./retry.js";
import { parseDataLine, streamLines } from "./base.js";

export interface FreebuffExecutorOptions extends OpenAIExecutorOptions {}

interface CatalogModelHandle {
    handle: string;
    key: string;
    displayName: string;
}

export class FreebuffExecutor extends OpenAIExecutor {
    private handleMap = new Map<string, CatalogModelHandle>();
    private catalogLoadedAt = 0;
    private currentRunId: string | null = null;
    private runIdExpiresAt = 0;

    constructor(options: FreebuffExecutorOptions = {}) {
        super({
            id: options.id ?? "freebuff",
            name: options.name ?? "Freebuff",
            baseUrl: options.baseUrl ?? FREEBUFF_BASE_URL,
            apiKey: options.apiKey,
            accessToken: options.accessToken
        });
    }

    protected override getHeaders(accept?: string): Record<string, string> {
        const headers = super.getHeaders(accept);
        headers["User-Agent"] = "ai-sdk/openai-compatible/0.0.36/codebuff";
        headers["x-freebuff-catalog-protocol"] = "1";
        headers["x-freebuff-client"] = "cli";
        return headers;
    }

    override async listModels(): Promise<ModelObject[]> {
        const token = this.accessToken || this.apiKey;
        if (token) {
            try {
                const res = await fetch(`${this.baseUrl}/freebuff/models`, {
                    method: "GET",
                    headers: this.getHeaders(),
                    signal: AbortSignal.timeout(10000)
                });
                if (res.ok) {
                    const data = (await res.json()) as {
                        rows?: Array<{
                            key?: string;
                            handle?: string;
                            displayName?: string;
                            name?: string;
                            label?: string;
                            access?: string;
                            contextWindow?: number;
                        }>;
                    };
                    if (Array.isArray(data.rows) && data.rows.length > 0) {
                        this.handleMap.clear();
                        const result: ModelObject[] = [];
                        for (const r of data.rows) {
                            const displayName = r.displayName || r.name || r.label || r.key || "";
                            const modelId = freebuffModelIdFromDisplayName(displayName, r.key);
                            const locked = r.access === "locked";

                            if (r.handle) {
                                const handleInfo = {
                                    handle: r.handle,
                                    key: r.key || "",
                                    displayName
                                };
                                this.handleMap.set(modelId.toLowerCase(), handleInfo);
                                this.handleMap.set(displayName.toLowerCase(), handleInfo);
                                if (r.key) {
                                    this.handleMap.set(r.key.toLowerCase(), handleInfo);
                                }
                            }

                            const mObj: ModelObject & { locked?: boolean } = {
                                id: modelId,
                                object: "model",
                                created: Math.floor(Date.now() / 1000),
                                owned_by: "freebuff",
                                name: displayName,
                                locked
                            };
                            result.push(mObj as ModelObject);
                        }
                        this.catalogLoadedAt = Date.now();
                        return result;
                    }
                }
            } catch {
                // Fallback to static model list on timeout or network error
            }
        }

        return FREEBUFF_MODELS.map((m) => {
            const mObj: ModelObject & { locked?: boolean } = {
                id: m.id,
                object: "model",
                created: 1700000000,
                owned_by: "freebuff",
                name: m.name,
                locked: m.locked ?? false
            };
            return mObj as ModelObject;
        });
    }

    private async ensureRunId(): Promise<string> {
        const now = Date.now();
        if (this.currentRunId && now < this.runIdExpiresAt) {
            return this.currentRunId;
        }

        const token = this.accessToken || this.apiKey;
        try {
            const res = await fetch(`${this.baseUrl}/agent-runs`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ action: "START", agentId: "base" }),
                signal: AbortSignal.timeout(8000)
            });
            if (res.ok) {
                const data = (await res.json()) as { runId?: string };
                if (data.runId) {
                    this.currentRunId = data.runId;
                    this.runIdExpiresAt = now + 15 * 60 * 1000;
                    return data.runId;
                }
            }
        } catch {
            // fallback
        }

        const fallbackRunId = crypto.randomUUID();
        this.currentRunId = fallbackRunId;
        this.runIdExpiresAt = now + 5 * 60 * 1000;
        return fallbackRunId;
    }

    private async resolveModelHandle(modelId: string): Promise<string> {
        const clean = modelId.includes("/") ? modelId.split("/").slice(1).join("/") : modelId;
        if (clean.startsWith("fbm1.")) return clean;

        if (this.handleMap.size === 0 || Date.now() - this.catalogLoadedAt > 30 * 60 * 1000) {
            await this.listModels();
        }

        const found = this.handleMap.get(clean.toLowerCase());
        if (found) return found.handle;

        return clean;
    }

    override async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        const targetModel = await this.resolveModelHandle(req.model);
        const runId = await this.ensureRunId();
        const url = `${this.baseUrl}/chat/completions`;
        const hdrs = this.getHeaders();

        const bodyPayload = {
            ...req,
            model: targetModel,
            stream: false,
            codebuff_metadata: {
                run_id: runId
            }
        };

        const res = await fetchWithRetry(url, bodyPayload as unknown as Record<string, unknown>, hdrs);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Freebuff Provider Error (${res.status}): ${errorText}`);
        }

        return (await res.json()) as ChatCompletionResponse;
    }

    override async *chatCompletionStream(
        req: ChatCompletionRequest
    ): AsyncGenerator<ChatCompletionChunk, void, void> {
        const targetModel = await this.resolveModelHandle(req.model);
        const runId = await this.ensureRunId();
        const url = `${this.baseUrl}/chat/completions`;
        const hdrs = this.getHeaders("text/event-stream, application/json, */*");

        const bodyPayload = {
            ...req,
            model: targetModel,
            stream: true,
            codebuff_metadata: {
                run_id: runId
            }
        };

        const res = await fetchWithRetry(url, bodyPayload as unknown as Record<string, unknown>, hdrs);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Freebuff Provider Stream Error (${res.status}): ${errorText}`);
        }

        if (!res.body) {
            throw new Error("No response body received for streaming");
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
