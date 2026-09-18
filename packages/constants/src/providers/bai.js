export const BAI_BASE_URL = "https://api.b.ai/v1";
export const BAI_DEFAULT_MODELS = [
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash (Free)" },
    { id: "deepseek-v4-flash-vision-exp", name: "DeepSeek V4 Flash Vision Exp (Free)" },
    { id: "mimo-v2.5", name: "MiMo V2.5 (Free)" },
    { id: "qwen3.8-flash", name: "Qwen 3.8 Flash (Free/Low-tier)" }
];
export const BAI_PROVIDER = {
    id: "bai",
    name: "B.AI",
    category: "free_tier",
    protocol: "openai",
    alias: "bai",
    base_url: BAI_BASE_URL,
    web_url: "https://b.ai",
    requires_api_key: true,
    supports_custom_url: true,
    status_message: "B.AI API key missing"
};
