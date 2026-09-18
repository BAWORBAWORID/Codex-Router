import { BLUESMINDS_BASE_URL } from "@srouter/constants";
import { OpenAIExecutor } from "./openai.js";
export class BluesMindsExecutor extends OpenAIExecutor {
    constructor(options = {}) {
        super({
            id: options.id ?? "bluesminds",
            name: options.name ?? "BluesMinds",
            baseUrl: options.baseUrl ?? BLUESMINDS_BASE_URL,
            apiKey: options.apiKey,
            accessToken: options.accessToken
        });
    }
}
