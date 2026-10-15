import type { ProviderMetadata } from "./types.js";

export const OPENCODE_ZEN_BASE_URL = "https://opencode.ai/zen/v1";

export interface OpenCodeZenModelDefinition {
    id: string;
    name: string;
}

/**
 * Fallback catalog for when https://opencode.ai/zen/v1/models is unreachable.
 * Upstream serves the full catalog anonymously, so this only pins what a live
 * sweep found usable without a Zen API key: every other community model either
 * returned FreeTierError ("only from within OpenCode") or an upstream failure.
 */
export const OPENCODE_ZEN_MODELS: OpenCodeZenModelDefinition[] = [
    { id: "space-bunny-free", name: "Space Bunny (Free)" }
];

export const OPENCODE_ZEN_MODEL_IDS: string[] = OPENCODE_ZEN_MODELS.map((m) => m.id);

export const OPENCODE_ZEN_PROVIDER: ProviderMetadata = {
    id: "opencode_zen",
    name: "OpenCode Zen",
    category: "free_tier",
    protocol: "openai",
    alias: "zen",
    base_url: OPENCODE_ZEN_BASE_URL,
    web_url: "https://opencode.ai/zen",
    requires_api_key: false,
    requires_oauth: false,
    supports_custom_url: true,
    status_message: "Community models work keyless; paid models need an OpenCode Zen API key"
};
