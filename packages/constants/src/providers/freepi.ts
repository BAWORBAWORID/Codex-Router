import type { ProviderMetadata } from "./types.js";

export const FREEPI_BASE_URL = "https://api.freepi.ai/v1";
export const FREEPI_AUTH_BASE_URL = "https://api.freepi.ai";
export const FREEPI_WEBSITE_URL = "https://freepi.ai";

export const FREEPI_PROVIDER: ProviderMetadata = {
    id: "freepi",
    name: "FreePi",
    category: "oauth",
    protocol: "openai",
    alias: "freepi",
    base_url: FREEPI_BASE_URL,
    web_url: FREEPI_WEBSITE_URL,
    requires_api_key: false,
    requires_oauth: true,
    supports_custom_url: false,
    status_message: "Login dengan akun GitHub (device code)"
};
