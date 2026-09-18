export const PROVIDER_CATEGORIES = [
    "oauth",
    "free_tier",
    "api_key",
    "self_hosted",
    "custom_provider"
];
export const CATEGORY_ORDER = [
    "oauth",
    "api_key",
    "self_hosted",
    "custom_provider",
    "free_tier"
];
export const CATEGORY_LABELS = {
    oauth: "OAuth Provider",
    api_key: "API Key Provider",
    self_hosted: "Self-hosted Provider",
    custom_provider: "Custom Provider",
    free_tier: "Free Tier Provider"
};
export const CATEGORY_DESCRIPTIONS = {
    oauth: "Signed in through a provider account rather than a key.",
    api_key: "Authenticated with a platform key you supply.",
    self_hosted: "Locally hosted model server (e.g. Ollama).",
    custom_provider: "User-registered endpoint with a custom base URL.",
    free_tier: "Free or rate-limited public endpoints."
};
export function isProviderCategory(value) {
    return PROVIDER_CATEGORIES.includes(value);
}
