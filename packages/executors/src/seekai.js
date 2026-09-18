import { SEEKAI_BASE_URL } from "@srouter/constants";
import { OpenAIExecutor } from "./openai.js";
export class SeekAIExecutor extends OpenAIExecutor {
    constructor(options = {}) {
        super({
            id: options.id ?? "seekai",
            name: options.name ?? "SeekAI",
            baseUrl: options.baseUrl ?? SEEKAI_BASE_URL,
            apiKey: options.apiKey,
            accessToken: options.accessToken
        });
    }
}
