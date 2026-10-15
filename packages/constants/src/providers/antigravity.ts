import type { ProviderMetadata } from "./types.js";

export const ANTIGRAVITY_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
export const ANTIGRAVITY_IDE_BASE_URL = "https://daily-cloudcode-pa.googleapis.com";

export const ANTIGRAVITY_OAUTH_CLIENT_ID =
    "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
export const ANTIGRAVITY_OAUTH_CLIENT_SECRET = "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";
export const ANTIGRAVITY_OAUTH_REDIRECT_URI = "http://localhost:1455/auth/antigravity/callback";
export const ANTIGRAVITY_OAUTH_SCOPE =
    "openid profile email https://www.googleapis.com/auth/cloud-platform";
export const ANTIGRAVITY_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const ANTIGRAVITY_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const ANTIGRAVITY_OAUTH_PROMPT = "consent";

export interface AntigravityModelDefinition {
    id: string;
    name: string;
}

/**
 * Chat-capable models, verified against
 * `POST cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels`. Ids are the
 * public SRouter names — parseAntigravityModelName() maps them to the CloudCode
 * internal names. Do not add an entry whose upstream id is absent there; the
 * request fails with 400 rather than degrading gracefully.
 */
export const ANTIGRAVITY_MODELS: AntigravityModelDefinition[] = [
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash" },
    { id: "gemini-3.6-flash-high", name: "Gemini 3.6 Flash (High)" },
    { id: "gemini-3.6-flash-medium", name: "Gemini 3.6 Flash (Medium)" },
    { id: "gemini-3.6-flash-low", name: "Gemini 3.6 Flash (Low)" },
    { id: "gemini-3.5-flash-high", name: "Gemini 3.5 Flash (High)" },
    { id: "gemini-3.5-flash-medium", name: "Gemini 3.5 Flash (Medium)" },
    { id: "gemini-3.5-flash-low", name: "Gemini 3.5 Flash (Low)" },
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite" },
    { id: "gemini-3.1-pro-high", name: "Gemini 3.1 Pro (High)" },
    { id: "gemini-3.1-pro-low", name: "Gemini 3.1 Pro (Low)" },
    { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-flash-thinking", name: "Gemini 2.5 Flash (Thinking)" },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6 (Thinking)" },
    { id: "claude-opus-4-6-thinking", name: "Claude Opus 4.6 (Thinking)" },
    { id: "gpt-oss-120b-medium", name: "GPT-OSS 120B (Medium)" }
];

export const ANTIGRAVITY_MODEL_IDS: string[] = ANTIGRAVITY_MODELS.map((m) => m.id);

export const ANTIGRAVITY_PROVIDER: ProviderMetadata = {
    id: "antigravity",
    name: "Google Antigravity",
    category: "oauth",
    protocol: "openai",
    base_url: ANTIGRAVITY_IDE_BASE_URL,
    web_url: "https://ai.google.dev",
    requires_api_key: false,
    requires_oauth: true,
    status_message: "Antigravity OAuth token missing"
};
