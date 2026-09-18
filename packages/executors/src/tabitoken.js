import { TABITOKEN_BASE_URL } from "@srouter/constants";
import { OpenAIExecutor } from "./openai.js";
export class TabiTokenExecutor extends OpenAIExecutor {
    constructor(options = {}) {
        super({
            id: options.id ?? "tabitoken",
            name: options.name ?? "TabiToken",
            baseUrl: options.baseUrl ?? TABITOKEN_BASE_URL,
            apiKey: options.apiKey,
            accessToken: options.accessToken
        });
    }
}
