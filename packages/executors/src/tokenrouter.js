import { TOKENROUTER_BASE_URL } from "@srouter/constants";
import { OpenAIExecutor } from "./openai.js";
export class TokenRouterExecutor extends OpenAIExecutor {
    constructor(options = {}) {
        super({
            id: options.id ?? "tokenrouter",
            name: options.name ?? "TokenRouter",
            baseUrl: options.baseUrl ?? TOKENROUTER_BASE_URL,
            apiKey: options.apiKey,
            accessToken: options.accessToken
        });
    }
}
