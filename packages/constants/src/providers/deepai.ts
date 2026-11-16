import type { ProviderMetadata } from "./types.js";

export const DEEPAI_BASE_URL = "http://127.0.0.1:8787/v1";

export interface DeepAIModelDefinition {
    id: string;
    name: string;
    contextWindow?: number;
    maxTokens?: number;
    description?: string;
    free: boolean;
    locked: boolean;
}

export const DEEPAI_MODELS: DeepAIModelDefinition[] = [
    {
        id: "glm-5.3-flash",
        name: "GLM 5.3 Flash",
        contextWindow: 1048576,
        maxTokens: 131072,
        description: "Free Tier model · 0 Credits",
        free: true,
        locked: false
    },
    {
        id: "deepseek-v4.1-flash",
        name: "DeepSeek V4.1 Flash 1017",
        contextWindow: 1048576,
        maxTokens: 131072,
        description: "Free Tier model · 0 Credits",
        free: true,
        locked: false
    },
    {
        id: "mimo-2.6-flash",
        name: "MiMo 2.6 Flash",
        contextWindow: 1048576,
        maxTokens: 131072,
        description: "Free Tier model · 0 Credits",
        free: true,
        locked: false
    },
    {
        id: "qwen-3.8-flash",
        name: "Qwen 3.8 Flash",
        contextWindow: 991000,
        maxTokens: 128000,
        description: "Free Tier model · 0 Credits",
        free: true,
        locked: false
    },
    {
        id: "minimax-m3.1-flash",
        name: "MiniMax M3.1 Flash",
        contextWindow: 1048576,
        maxTokens: 131072,
        description: "Free Tier model · 0 Credits",
        free: true,
        locked: false
    },
    {
        id: "muse-ember",
        name: "Muse Ember",
        contextWindow: 1048576,
        maxTokens: 131072,
        description: "Free Tier model · 0 Credits",
        free: true,
        locked: false
    },
    {
        id: "solar-mini-4",
        name: "Solar Mini 4",
        contextWindow: 524288,
        maxTokens: 131072,
        description: "Free Tier model · 0 Credits",
        free: true,
        locked: false
    },
    {
        id: "gpt-6-luna",
        name: "GPT-6 Luna",
        contextWindow: 1048576,
        maxTokens: 128000,
        description: "Free Tier model · 0 Credits",
        free: true,
        locked: false
    },
    {
        id: "mimo-2.6-pro",
        name: "MiMo 2.6 Pro",
        contextWindow: 1048576,
        maxTokens: 131072,
        description: "Free Tier model · 0 Credits",
        free: true,
        locked: false
    },
    {
        id: "glyph-cluster",
        name: "Glyph Cluster",
        contextWindow: 256000,
        maxTokens: 131072,
        description: "Free Tier model · 0 Credits",
        free: true,
        locked: false
    },
    {
        id: "deepai-cyber",
        name: "DeepAI Cyber",
        contextWindow: 1048576,
        maxTokens: 131072,
        description: "Free Tier model · 0 Credits",
        free: true,
        locked: false
    },
    {
        id: "minimax-m3",
        name: "MiniMax M3",
        contextWindow: 512000,
        maxTokens: 131000,
        description: "Premier model · 2 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "gpt-6.1-sol",
        name: "GPT-6.1 Sol",
        contextWindow: 1048576,
        maxTokens: 128000,
        description: "Premier model · 10 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "gemini-4-argon",
        name: "Gemini 4 Argon",
        contextWindow: 1048576,
        maxTokens: 131072,
        description: "Premier model · 10 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "glm-5.3",
        name: "GLM 5.3",
        contextWindow: 1048576,
        maxTokens: 131072,
        description: "Premier model · 3 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "kimi-k3",
        name: "Kimi K3",
        contextWindow: 1048576,
        maxTokens: 131072,
        description: "Premier model · 3 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "kimi-k3.1-pro",
        name: "Kimi K3.1 Pro",
        contextWindow: 1000000,
        maxTokens: 131072,
        description: "Premier model · 3 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "gpt-6.1-terra",
        name: "GPT-6.1 Terra",
        contextWindow: 1048576,
        maxTokens: 128000,
        description: "Premier model · 5 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "muse-spark-1.3",
        name: "Muse Spark 1.3",
        contextWindow: 1048576,
        maxTokens: 131072,
        description: "Premier model · 6 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "gemini-4-hydrogen",
        name: "Gemini 4 Hydrogen",
        contextWindow: 1000000,
        maxTokens: 131072,
        description: "Premier model · 8 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "gemini-4-carbon",
        name: "Gemini 4 Carbon",
        contextWindow: 1000000,
        maxTokens: 131072,
        description: "Premier model · 10 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "claude-sonnet-5-5",
        name: "Claude Sonnet 5.5",
        contextWindow: 1000000,
        maxTokens: 64000,
        description: "Premier model · 10 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "claude-opus-5-5",
        name: "Claude Opus 5.5",
        contextWindow: 1000000,
        maxTokens: 64000,
        description: "Premier model · 15 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "muse-wonder",
        name: "Muse Wonder",
        contextWindow: 1048576,
        maxTokens: 131072,
        description: "Premier model · 15 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "qwen-3.8-max-prime",
        name: "Qwen 3.8 Max Prime",
        contextWindow: 1000000,
        maxTokens: 131072,
        description: "Premier model · 15 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "claude-fable-5-2",
        name: "Claude Fable 5.2",
        contextWindow: 1000000,
        maxTokens: 64000,
        description: "Premier model · 20 Credits/req",
        free: false,
        locked: false
    },
    {
        id: "gpt-6-astra",
        name: "GPT-6 Astra",
        contextWindow: 1048576,
        maxTokens: 128000,
        description: "Premier model · 50 Credits/req",
        free: false,
        locked: false
    },
];

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
