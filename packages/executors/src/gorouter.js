import { GOROUTER_BASE_URL } from "@srouter/constants";
import { OpenAIExecutor } from "./openai.js";
export class GoRouterExecutor extends OpenAIExecutor {
    constructor(options = {}) {
        super({
            id: options.id ?? "gorouter",
            name: options.name ?? "GoRouter",
            baseUrl: options.baseUrl ?? GOROUTER_BASE_URL,
            apiKey: options.apiKey,
            accessToken: options.accessToken
        });
    }
}
