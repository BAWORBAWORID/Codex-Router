import type { ProviderMetadata } from "./types.js";

export const KILOCODE_BASE_URL = "https://api.kilo.ai/api/gateway";

export const KILOCODE_PROVIDER: ProviderMetadata = {
    id: "kilocode",
    name: "Kilo Code",
    category: "api_key",
    protocol: "openai",
    alias: "kilo",
    base_url: KILOCODE_BASE_URL,
    web_url: "https://kilo.ai",
    requires_api_key: true,
    supports_custom_url: true,
    status_message: "Kilo Code API key missing"
};
