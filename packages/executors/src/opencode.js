import { OPENCODE_ZEN_BASE_URL } from "@srouter/constants";
import { OpenAIExecutor } from "./openai.js";
const OPENCODE_ZEN_MAX_TOKENS = 512;
export const OPENCODE_ZEN_MODELS = [
    { id: "big-pickle", name: "Big Pickle (Free)" },
    { id: "laguna-s-2.1-free", name: "Poolside Laguna S 2.1 (Free)" },
    { id: "nemotron-3.5-lightning-free", name: "Nemotron 3.5 Lightning (Free)" },
    { id: "nemotron-3-ultra-free", name: "Nemotron 3 Ultra (Free)" },
    { id: "mimo-v2.5-free", name: "Xiaomi MiMo V2.5 (Free)" }
];
export const OPENCODE_ZEN_MODEL_IDS = OPENCODE_ZEN_MODELS.map((m) => m.id);
function clampMaxTokens(req) {
    if (req.max_tokens && req.max_tokens > OPENCODE_ZEN_MAX_TOKENS) {
        return { ...req, max_tokens: OPENCODE_ZEN_MAX_TOKENS };
    }
    return req;
}
export class OpenCodeZenExecutor extends OpenAIExecutor {
    constructor(options = {}) {
        super({
            id: options.id ?? "opencode_zen",
            name: options.name ?? "OpenCode Zen (Free)",
            baseUrl: options.baseUrl ?? OPENCODE_ZEN_BASE_URL,
            apiKey: options.apiKey ?? "",
            accessToken: options.accessToken ?? ""
        });
    }
    async listModels() {
        const baseId = this.id.split("_")[0]?.split("-")[0] ?? this.id;
        return OPENCODE_ZEN_MODELS.map((m) => ({
            id: `${baseId}/${m.id}`,
            object: "model",
            owned_by: baseId
        }));
    }
    async chatCompletion(req) {
        return super.chatCompletion(clampMaxTokens(req));
    }
    async *chatCompletionStream(req) {
        yield* super.chatCompletionStream(clampMaxTokens(req));
    }
}
