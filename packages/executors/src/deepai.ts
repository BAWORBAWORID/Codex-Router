import { DEEPAI_BASE_URL, DEEPAI_MODELS } from "@codex/constants";
import type { ChatCompletionChunk, ChatCompletionRequest, ChatCompletionResponse, ModelObject } from "@codex/types";
import { OpenAIExecutor, type OpenAIExecutorOptions } from "./openai.js";

function resolveDeepAIMaxTokens(req: ChatCompletionRequest): ChatCompletionRequest {
    const rawModel = req.model.includes("/") ? req.model.split("/")[1] ?? req.model : req.model;
    const modelDef = DEEPAI_MODELS.find((m) => m.id.toLowerCase() === rawModel.toLowerCase());
    const modelMax = modelDef?.maxTokens ?? 131072;

    const currentMax = typeof req.max_tokens === "number" ? req.max_tokens : undefined;
    if (currentMax === undefined || currentMax > modelMax) {
        return { ...req, max_tokens: modelMax };
    }
    return req;
}

export interface DeepAIExecutorOptions extends OpenAIExecutorOptions {}

export class DeepAIExecutor extends OpenAIExecutor {
    constructor(options: DeepAIExecutorOptions = {}) {
        super({
            id: options.id ?? "deepai",
            name: options.name ?? "DeepAI",
            baseUrl: options.baseUrl ?? DEEPAI_BASE_URL,
            apiKey: options.apiKey,
            accessToken: options.accessToken
        });
    }

    override async chatCompletion(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
        return super.chatCompletion(resolveDeepAIMaxTokens(req));
    }

    override async *chatCompletionStream(
        req: ChatCompletionRequest
    ): AsyncGenerator<ChatCompletionChunk, void, void> {
        yield* super.chatCompletionStream(resolveDeepAIMaxTokens(req));
    }

    override async listModels(): Promise<ModelObject[]> {
        const token = this.accessToken || this.apiKey;
        if (token) {
            try {
                const res = await fetch("https://api.deepai.org/deepai_code/models", {
                    method: "GET",
                    headers: {
                        accept: "application/json",
                        "user-agent": "deepai-gateway/1.0",
                        "X-DeepAI-Code-Theos": "4",
                        "X-DeepAI-Code-Instance": "a1b2c3d4e5f67890a1b2c3d4e5f67890",
                        "Api-Key": token
                    },
                    signal: AbortSignal.timeout(8000)
                });

                if (res.status === 401) {
                    throw new Error("DEEPAI_AUTH_EXPIRED: Session token expired (401)");
                }

                if (res.ok) {
                    const data = (await res.json()) as {
                        models?: Array<{
                            id: string;
                            name?: string;
                            contextWindow?: number;
                            maxTokens?: number;
                            premier?: boolean;
                            theosPerRequest?: string;
                        }>;
                    };
                    const list = data.models || [];
                    if (list.length > 0) {
                        return list.map((m) => {
                            const isFree = !m.premier;
                            const price = m.theosPerRequest || "0";
                            const desc = isFree ? "Free Tier model · 0 Credits" : `Premier model · ${price} Credits/req`;
                            const mObj: ModelObject & { description?: string; locked?: boolean; free?: boolean } = {
                                id: m.id,
                                object: "model",
                                created: Math.floor(Date.now() / 1000),
                                owned_by: "deepai",
                                name: m.name || m.id,
                                description: desc,
                                free: isFree,
                                locked: false
                            };
                            return mObj as ModelObject;
                        });
                    }
                }
            } catch (err) {
                if (err instanceof Error && err.message.includes("DEEPAI_AUTH_EXPIRED")) {
                    throw err;
                }
                // Fallback to static model list on transient errors
            }
        }

        return DEEPAI_MODELS.map((m) => {
            const mObj: ModelObject & { description?: string; locked?: boolean; free?: boolean } = {
                id: m.id,
                object: "model",
                created: 1700000000,
                owned_by: "deepai",
                name: m.name,
                description: m.description,
                free: m.free,
                locked: m.locked
            };
            return mObj as ModelObject;
        });
    }
}
