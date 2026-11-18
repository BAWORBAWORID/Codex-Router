import { OPENROUTER_BASE_URL } from "@codex/constants";
import type { ModelObject } from "@codex/types";
import { OpenAIExecutor, type OpenAIExecutorOptions } from "./openai.js";

export interface OpenRouterExecutorOptions extends OpenAIExecutorOptions {}

interface OpenRouterKeyInfo {
    is_free_tier?: boolean;
}

// Models that are known to fail on free tier (router models requiring paid credits,
// offline/timeout models, audio-only previews, or upstream rate-limited endpoints)
const FAILED_FREE_MODELS = new Set([
    "thinkingmachines/inkling-2-small:free",
    "particle-ai/particle-1:free",
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
    "google/lyria-3-pro-preview",
    "google/lyria-3-clip-preview",
    "openrouter/auto",
    "openrouter/auto-code",
    "openrouter/auto-beta",
    "openrouter/fusion",
    "openrouter/pareto-code",
    "openrouter/bodybuilder"
]);

export class OpenRouterExecutor extends OpenAIExecutor {
    constructor(options: OpenRouterExecutorOptions = {}) {
        super({
            id: options.id ?? "openrouter",
            name: options.name ?? "OpenRouter",
            baseUrl: options.baseUrl ?? OPENROUTER_BASE_URL,
            apiKey: options.apiKey,
            accessToken: options.accessToken
        });
    }

    async listModels(): Promise<ModelObject[]> {
        try {
            // 1. Check if account is free tier
            let isFreeTier = false;
            try {
                const keyRes = await fetch(`${this.baseUrl}/auth/key`, {
                    headers: this.getHeaders()
                });
                if (keyRes.ok) {
                    const keyInfo = (await keyRes.json()) as { data?: OpenRouterKeyInfo };
                    isFreeTier = keyInfo?.data?.is_free_tier === true;
                }
            } catch {
                // If checking fails, proceed with default
            }

            // 2. Fetch all models
            const res = await fetch(`${this.baseUrl}/models`, {
                method: "GET",
                headers: this.getHeaders()
            });
            if (!res.ok) return [];

            const data = (await res.json()) as {
                data?: Array<{
                    id: string;
                    name?: string;
                    pricing?: { prompt?: string; completion?: string };
                }>;
            };
            if (!Array.isArray(data.data)) return [];

            const baseId = this.id.split("_")[0]?.split("-")[0] ?? this.id;

            return data.data.map((m) => {
                const inputPrice = parseFloat(m.pricing?.prompt ?? "1");
                const isFreeCandidate =
                    inputPrice === 0 ||
                    m.id.endsWith(":free") ||
                    m.id === "openrouter/free";

                // Only clearly working free models are Available; all others (paid/failed/unknown) are Locked.
                const isWorkingFreeModel = isFreeCandidate && !FAILED_FREE_MODELS.has(m.id);
                const locked = !isWorkingFreeModel;

                return {
                    id: `${baseId}/${m.id}`,
                    object: "model" as const,
                    name: m.name,
                    owned_by: baseId,
                    locked
                } as ModelObject & { locked: boolean };
            });
        } catch {
            return [];
        }
    }
}
