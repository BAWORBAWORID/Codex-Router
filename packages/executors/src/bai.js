import { BAI_BASE_URL, BAI_DEFAULT_MODELS } from "@srouter/constants";
import { OpenAIExecutor } from "./openai.js";
export class BAIExecutor extends OpenAIExecutor {
    constructor(options = {}) {
        super({
            id: options.id ?? "bai",
            name: options.name ?? "B.AI",
            baseUrl: options.baseUrl ?? BAI_BASE_URL,
            apiKey: options.apiKey,
            accessToken: options.accessToken
        });
    }
    async listModels() {
        const liveModels = await super.listModels();
        if (liveModels && liveModels.length > 0) {
            return liveModels;
        }
        const baseId = this.id.split("_")[0]?.split("-")[0] ?? this.id;
        return BAI_DEFAULT_MODELS.map((m) => ({
            id: `${baseId}/${m.id}`,
            object: "model",
            owned_by: baseId
        }));
    }
}
