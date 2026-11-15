import type { ProviderMetadata } from "./types.js";

export const FREEBUFF_BASE_URL = "https://www.codebuff.com/api/v1";
export const FREEBUFF_WEBSITE_URL = "https://www.codebuff.com";

export interface FreebuffModelDefinition {
    id: string;
    name: string;
    contextWindow?: number;
    description?: string;
    free?: boolean;
    locked?: boolean;
}

export const FREEBUFF_DISPLAY_TO_ID: Record<string, string> = {
    "DeepSeek V4.1 Flash Fast": "deepseek-v4.1-flash-fast",
    "DeepSeek V4.1 Flash": "deepseek-v4.1-flash",
    "DeepSeek V4.1 Flash Slow": "deepseek-v4.1-flash-slow",
    "Solar Mini 4": "solar-mini-4",
    "Solar Pro 4": "solar-pro-4",
    "Glyph Cluster": "glyph-cluster",
    "Nemotron 3.5 Lightning": "nemotron-3.5-lightning",
    "Beam 1.0": "beam-1.0",
    "GPT-6 Luna": "gpt-6-luna",
    "Muse Spark 1.3": "muse-spark-1.3",
    "Claude Haiku 5.5 · 100k context": "claude-haiku-5.5-100k",
    "Muse Ember": "muse-ember"
};

export function freebuffModelIdFromDisplayName(displayName: string, key?: string): string {
    if (FREEBUFF_DISPLAY_TO_ID[displayName]) {
        return FREEBUFF_DISPLAY_TO_ID[displayName];
    }
    const slug = displayName
        .toLowerCase()
        .replace(/·/g, "")
        .replace(/[^a-z0-9.]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug || key || "freebuff-model";
}

export const FREEBUFF_MODELS: FreebuffModelDefinition[] = [
    {
        id: "deepseek-v4.1-flash-fast",
        name: "DeepSeek V4.1 Flash Fast",
        contextWindow: 1048576,
        description: "Fastest DeepSeek V4.1 Flash, 1M context",
        free: true,
        locked: false
    },
    {
        id: "deepseek-v4.1-flash",
        name: "DeepSeek V4.1 Flash",
        contextWindow: 1048576,
        description: "Steady speed DeepSeek V4.1 Flash (100 tps), 1M context",
        free: true,
        locked: false
    },
    {
        id: "deepseek-v4.1-flash-slow",
        name: "DeepSeek V4.1 Flash Slow",
        contextWindow: 375000,
        description: "Slow · cheapest with light reasoning",
        free: true,
        locked: false
    },
    {
        id: "solar-mini-4",
        name: "Solar Mini 4",
        contextWindow: 500000,
        description: "Upstage fast and light model, 500K context",
        free: true,
        locked: false
    },
    {
        id: "solar-pro-4",
        name: "Solar Pro 4",
        contextWindow: 500000,
        description: "Upstage flagship model, 500K context",
        free: true,
        locked: false
    },
    {
        id: "glyph-cluster",
        name: "Glyph Cluster",
        contextWindow: 256000,
        description: "Stealth preview reasoning model, 256K context",
        free: true,
        locked: false
    },
    {
        id: "nemotron-3.5-lightning",
        name: "Nemotron 3.5 Lightning",
        contextWindow: 256000,
        description: "Fast reasoning model, 256K context",
        free: true,
        locked: false
    },
    {
        id: "beam-1.0",
        name: "Beam 1.0",
        contextWindow: 256000,
        description: "Reflection & coding model, 256K context",
        free: true,
        locked: false
    },
    {
        id: "gpt-6-luna",
        name: "GPT-6 Luna",
        contextWindow: 1000000,
        description: "OpenAI flex capacity model (Paid plan), 1M context",
        free: false,
        locked: true
    },
    {
        id: "muse-spark-1.3",
        name: "Muse Spark 1.3",
        contextWindow: 1000000,
        description: "Meta agentic coding model (Paid plan), 1M context",
        free: false,
        locked: true
    },
    {
        id: "claude-haiku-5.5-100k",
        name: "Claude Haiku 5.5 · 100k context",
        contextWindow: 100000,
        description: "Anthropic fast 100K context model (Paid plan)",
        free: false,
        locked: true
    },
    {
        id: "muse-ember",
        name: "Muse Ember",
        contextWindow: 375000,
        description: "Meta fast coding model (Paid plan), 375K context",
        free: false,
        locked: true
    }
];

export const FREEBUFF_PROVIDER: ProviderMetadata = {
    id: "freebuff",
    name: "Freebuff",
    category: "oauth",
    protocol: "openai",
    alias: "freebuff",
    base_url: FREEBUFF_BASE_URL,
    web_url: "https://freebuff.com",
    requires_api_key: false,
    requires_oauth: true,
    supports_custom_url: true,
    status_message: "Freebuff account not connected"
};
