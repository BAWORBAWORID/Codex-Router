import { KILOCODE_BASE_URL, providerAlias, providerBaseId } from "@codex/constants";
import type { ModelObject } from "@codex/types";
import { OpenAIExecutor, type OpenAIExecutorOptions } from "./openai.js";

export interface KiloCodeExecutorOptions extends OpenAIExecutorOptions {}

interface KiloRawModel {
    id?: unknown;
    name?: unknown;
    created?: unknown;
    owned_by?: unknown;
    isFree?: unknown;
    is_free?: unknown;
    free?: unknown;
    context_length?: unknown;
    top_provider?: { max_completion_tokens?: unknown };
}

export type KiloModelObject = ModelObject & { locked?: boolean };

/**
 * Kilo publishes an explicit isFree flag on every model. Use it directly so
 * free models land in "Available" and everything else in "Locked", including
 * auto routers whose pricing is a dynamic "-1" placeholder.
 */
export function classifyKiloModels(models: KiloRawModel[], prefix = ""): KiloModelObject[] {
    const result: KiloModelObject[] = [];
    for (const model of models) {
        const rawId = typeof model.id === "string" ? model.id.trim() : "";
        if (!rawId) continue;
        const id = `${prefix}${rawId}`;

        const flag = model.isFree ?? model.is_free ?? model.free;
        const locked = flag === undefined ? false : !Boolean(flag);

        result.push({
            id,
            object: "model",
            ...(typeof model.created === "number" ? { created: model.created } : {}),
            owned_by:
                typeof model.owned_by === "string" && model.owned_by
                    ? model.owned_by
                    : "kilo",
            ...(typeof model.name === "string" && model.name ? { name: model.name } : {}),
            ...(typeof model.context_length === "number"
                ? { context_length: model.context_length }
                : {}),
            ...(typeof model.top_provider?.max_completion_tokens === "number"
                ? { max_completion_tokens: model.top_provider.max_completion_tokens }
                : {}),
            locked
        });
    }
    return result;
}

export class KiloCodeExecutor extends OpenAIExecutor {
    constructor(options: KiloCodeExecutorOptions = {}) {
        super({
            id: options.id ?? "kilocode",
            name: options.name ?? "Kilo Code",
            baseUrl: options.baseUrl ?? KILOCODE_BASE_URL,
            apiKey: options.apiKey,
            accessToken: options.accessToken
        });
    }

    async listModels(): Promise<ModelObject[]> {
        try {
            const res = await fetch(`${this.baseUrl}/models`, {
                method: "GET",
                headers: this.getHeaders()
            });
            if (!res.ok) throw new Error(`Kilo Code Error (${res.status})`);
            const data = (await res.json()) as { data?: KiloRawModel[] };
            const baseId = providerBaseId(this.id);
            const prefix = `${providerAlias(baseId)}/`;
            return classifyKiloModels(Array.isArray(data.data) ? data.data : [], prefix);
        } catch {
            return [];
        }
    }
}
