import { DEEPAI_BASE_URL } from "@codex/constants";
import { OpenAIExecutor, type OpenAIExecutorOptions } from "./openai.js";

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
}
