import type { ProviderMetadata } from "./types.js";

export const DEEPAI_BASE_URL = "http://127.0.0.1:8787/v1";

export const DEEPAI_PROVIDER: ProviderMetadata = {
    id: "deepai",
    name: "DeepAI",
    category: "oauth",
    protocol: "openai",
    alias: "deepai",
    base_url: DEEPAI_BASE_URL,
    web_url: "https://deepai.org",
    requires_api_key: false,
    requires_oauth: true,
    supports_custom_url: true,
    status_message: "DeepAI account not connected"
};
