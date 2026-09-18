export const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
export const DEEPSEEK_PROVIDER = {
    id: "deepseek",
    name: "DeepSeek",
    category: "api_key",
    protocol: "openai",
    alias: "ds",
    base_url: DEEPSEEK_BASE_URL,
    web_url: "https://deepseek.com",
    requires_api_key: true,
    supports_custom_url: true,
    status_message: "DeepSeek API key missing"
};
