import {
    DEFAULT_PROVIDER_MAP,
    isProviderCategory,
    isSeedProvider,
    providerAlias
} from "@codex/constants";
import type {
    CreateProviderZod,
    ModelObject,
    ProviderCategory,
    ProviderConfig,
    ProviderDefinition,
    ProviderProtocol,
    VerifyProviderZod
} from "@codex/types";
import {
    addCustomModelDB,
    deleteCustomModelDB,
    getAllProvidersDB,
    getCustomModelsByProviderDB,
    upsertProviderDB
} from "@codex/db";
import { loadSavedProvidersFromDB, registry } from "@/services/registry.js";
import { pruneDeepAIProvider } from "@/services/tokenRefresh.js";
import { AssertPublicUrl } from "@/utils/ssrf.js";

export interface GroupedCatalog {
    oauth: ProviderDefinition[];
    free_tier: ProviderDefinition[];
    api_key: ProviderDefinition[];
    custom_provider: ProviderDefinition[];
}

export interface CatalogSummary {
    total: number;
    categories: GroupedCatalog;
}

export type CreateProviderPayload = CreateProviderZod;

function isProviderProtocol(Value: string): Value is ProviderProtocol {
    return ["openai", "anthropic", "gemini", "custom"].includes(Value);
}

const PROVIDER_IDS_BY_LENGTH = Object.keys(DEFAULT_PROVIDER_MAP).sort(
    (Left, Right) => Right.length - Left.length
);

function BaseIdOf(ProviderId: string): string {
    for (const Id of PROVIDER_IDS_BY_LENGTH) {
        if (
            ProviderId === Id ||
            ProviderId.startsWith(`${Id}_`) ||
            ProviderId.startsWith(`${Id}-`)
        ) {
            return Id;
        }
    }
    return ProviderId;
}

export function mergeProviderModels(
    ProviderId: string,
    LiveModels: ModelObject[],
    CustomModels: ModelObject[]
): ModelObject[] {
    const Prefix = `${providerAlias(BaseIdOf(ProviderId)).toLowerCase()}/`;
    const Merged = new Map<string, ModelObject>();

    for (const Model of [...LiveModels, ...CustomModels]) {
        const NormalizedId = Model.id.trim().toLowerCase();
        const Key = NormalizedId.startsWith(Prefix)
            ? NormalizedId.slice(Prefix.length)
            : NormalizedId;
        if (!Merged.has(Key)) Merged.set(Key, Model);
    }

    return Array.from(Merged.values());
}

function ProviderDefinitionFromConfig(Connection: ProviderConfig): ProviderDefinition {
    const Category: ProviderCategory =
        Connection.category && isProviderCategory(Connection.category)
            ? Connection.category
            : "api_key";

    return {
        id: Connection.id,
        name: Connection.name,
        category: Category,
        protocol:
            Connection.protocol && isProviderProtocol(Connection.protocol)
                ? Connection.protocol
                : "openai",
        default_base_url: Connection.base_url,
        requires_api_key: Boolean(Connection.apiKey),
        supports_custom_url: true,
        status: { state: "connected", connectedCount: 1 },
        models: []
    };
}

function CatalogWithSavedProviders(): ProviderDefinition[] {
    const Rows = getAllProvidersDB();
    const Catalog: ProviderDefinition[] = [];
    const Seen = new Set<string>();

    // Separate OAuth providers (category === "oauth") from others.
    // OAuth providers (Antigravity, OpenAI Codex OAuth, etc.) should be shown
    // individually at /providers/antigravity_XXX and /providers/openai_codex_XXX
    // so they don't get grouped under BaseIdOf with other providers.
    const oauthRows = Rows.filter((C) => C.category === "oauth");
    const otherRows = Rows.filter((C) => C.category !== "oauth");

    // Process non-OAuth providers using BaseIdOf grouping
    // This groups them by provider type (openai, anthropic, etc.)
    for (const Connection of otherRows) {
        const BaseId = BaseIdOf(Connection.providerId || Connection.id);
        if (Seen.has(BaseId)) continue;
        Seen.add(BaseId);

        const Seed = DEFAULT_PROVIDER_MAP[BaseId];
        const Category: ProviderCategory =
            Connection.category && isProviderCategory(Connection.category)
                ? Connection.category
                : (Seed?.category ?? "api_key");
        const Protocol: ProviderProtocol =
            Connection.protocol && isProviderProtocol(Connection.protocol)
                ? Connection.protocol
                : (Seed?.protocol ?? "openai");

        const ConnectedCount = Rows.filter(
            (C) => !isSeedProvider(C) && C.enabled && BaseIdOf(C.providerId || C.id) === BaseId
        ).length;

        Catalog.push({
            id: BaseId,
            name: Seed?.name ?? Connection.name,
            category: Seed?.category ?? Category,
            protocol: Seed?.protocol ?? Protocol,
            default_base_url: Seed?.base_url ?? Connection.base_url,
            requires_api_key: Seed ? Seed.requires_api_key : Boolean(Connection.apiKey),
            requires_oauth: Seed?.requires_oauth,
            supports_custom_url: Seed ? (Seed.supports_custom_url ?? true) : true,
            status: {
                state: ConnectedCount > 0 ? "connected" : "no_connections",
                message: Seed?.status_message,
                connectedCount: ConnectedCount
            },
            models: []
        });
    }

    for (const Seed of Object.values(DEFAULT_PROVIDER_MAP)) {
        if (Seen.has(Seed.id)) continue;
        Seen.add(Seed.id);

        const ConnectedCount = Rows.filter(
            (C) => !isSeedProvider(C) && C.enabled && BaseIdOf(C.providerId || C.id) === Seed.id
        ).length;

        Catalog.push({
            id: Seed.id,
            name: Seed.name,
            category: Seed.category,
            protocol: Seed.protocol,
            default_base_url: Seed.base_url,
            requires_api_key: Seed.requires_api_key,
            requires_oauth: Seed.requires_oauth,
            supports_custom_url: Seed.supports_custom_url ?? true,
            status: {
                state: ConnectedCount > 0 ? "connected" : "no_connections",
                message: Seed.status_message,
                connectedCount: ConnectedCount
            },
            models: []
        });
    }

    return Catalog;
}

export class ProvidersLogic {
    public static ListProviders(): ProviderDefinition[] {
        const Catalog = CatalogWithSavedProviders();
        // Filter out OAuth providers (individual accounts like Antigravity, OpenAI Codex OAuth)
        // so /providers shows only categorized providers (openai, anthropic, etc.)
        return Catalog.filter((P) => P.category !== "oauth");
    }

    public static GetCatalog(): CatalogSummary {
        const Catalog = CatalogWithSavedProviders();

        const Categories: GroupedCatalog = {
            oauth: Catalog.filter((P) => P.category === "oauth"),
            free_tier: Catalog.filter((P) => P.category === "free_tier"),
            api_key: Catalog.filter((P) => P.category === "api_key"),
            custom_provider: Catalog.filter((P) => P.category === "custom_provider")
        };

        return {
            total: Catalog.length,
            categories: Categories
        };
    }

    public static async GetProviderById(ProviderId: string): Promise<ProviderDefinition | null> {
        const Catalog = CatalogWithSavedProviders();
        const Provider = Catalog.find((P) => P.id.toLowerCase() === ProviderId.toLowerCase());
        if (!Provider) return null;

        const Connections = getAllProvidersDB().filter(
            (C) => !isSeedProvider(C) && BaseIdOf(C.providerId || C.id) === ProviderId
        );
        const ConnectedCount = Connections.filter((C) => C.enabled).length;

        let LiveModels = mergeProviderModels(ProviderId, Provider.models, []);
        const MatchingProviders = Array.from(registry.getAllProviders().values()).filter(
            (P) =>
                P.id === ProviderId ||
                P.id.startsWith(`${ProviderId}_`) ||
                P.id.startsWith(`${ProviderId}-`)
        );

        for (const P of MatchingProviders) {
            try {
                const Fetched = await registry.getProviderModels(P);
                LiveModels = mergeProviderModels(ProviderId, LiveModels, Fetched);
            } catch {}
        }

        const CustomModels = ProvidersLogic.ListCustomModels(ProviderId);
        LiveModels = mergeProviderModels(ProviderId, LiveModels, CustomModels);

        // For openrouter, only show unlocked models in available models to prevent 400+ locked clutter
        if (ProviderId.toLowerCase() === "openrouter") {
            LiveModels = LiveModels.filter((m) => !(m as { locked?: boolean }).locked);
        }

        return {
            ...Provider,
            connections: Connections,
            models: LiveModels,
            status: {
                ...Provider.status,
                connectedCount: ConnectedCount,
                state: ConnectedCount > 0 ? "connected" : "no_connections"
            }
        };
    }

    public static AddProvider(Payload: CreateProviderPayload): ProviderDefinition {
        const Name = Payload.name?.trim();
        if (!Name) throw new Error("Provider name is required");
        if (!isProviderCategory(Payload.category)) throw new Error("Invalid provider category");
        if (!isProviderProtocol(Payload.protocol)) throw new Error("Invalid provider protocol");
        const RawId = Payload.id?.trim();
        let Id: string;

        if (RawId) {
            // Explicit ID provided (OAuth flows, imports): sanitize as before
            Id = RawId.toLowerCase().replace(/[^a-z0-9_-]/g, "");
            if (!Id)
                throw new Error(
                    "Provider ID must contain letters, numbers, underscores, or hyphens"
                );
            if (getAllProvidersDB().some((Provider) => Provider.id === Id))
                throw new Error(`Provider ID '${Id}' already exists`);
        } else {
            // Custom provider: generate UUID v4 as immutable internal ID
            Id = crypto.randomUUID();
        }
        const Category = Payload.category;
        const Protocol = Payload.protocol;
        const BaseUrl = Payload.base_url?.trim();
        if (BaseUrl) {
            try {
                const Url = new URL(BaseUrl);
                if (!["http:", "https:"].includes(Url.protocol))
                    throw new Error("unsupported protocol");
            } catch {
                throw new Error("Base URL must be a valid HTTP or HTTPS URL");
            }
        }
        const ApiKey = Payload.api_key?.trim();
        if ((Category === "api_key" || Category === "custom_provider") && !ApiKey)
            throw new Error("API key is required for API key and custom providers");

        const Config = {
            id: Id,
            providerId: Payload.provider_id || Id,
            name: Name,
            category: Category,
            protocol: Protocol,
            base_url: BaseUrl,
            apiKey: ApiKey,
            accessToken: Payload.access_token,
            refreshToken: Payload.refresh_token,
            providerSpecificData: Payload.provider_specific_data,
            customHeaders: Payload.custom_headers,
            enabled: true,
            createdAt: Date.now()
        };

        upsertProviderDB(Config);
        loadSavedProvidersFromDB();

        return ProviderDefinitionFromConfig(Config);
    }

    public static async AddCustomModel(ProviderId: string, ModelId: string): Promise<ModelObject> {
        const Id = ProviderId.toLowerCase();
        if (
            !DEFAULT_PROVIDER_MAP[Id] &&
            !getAllProvidersDB().some((P) => BaseIdOf(P.providerId || P.id) === Id)
        ) {
            throw new Error(`Provider '${ProviderId}' not found`);
        }
        const Trimmed = ModelId.trim();
        if (!Trimmed) throw new Error("Model ID is required");
        if (Trimmed.length > 200 || !/^[A-Za-z0-9._\-/: ]+$/.test(Trimmed))
            throw new Error(
                "Model ID may only contain letters, numbers, dots, dashes, underscores, slashes, colons, and spaces"
            );

        const Alias = providerAlias(Id);
        let CleanModelId = Trimmed;
        if (CleanModelId.toLowerCase().startsWith(`${Alias.toLowerCase()}/`)) {
            CleanModelId = CleanModelId.slice(Alias.length + 1);
        } else if (CleanModelId.toLowerCase().startsWith(`${Id}/`)) {
            CleanModelId = CleanModelId.slice(Id.length + 1);
        }

        // Check if already in built-in / default catalog
        const defaultModels = DEFAULT_PROVIDER_MAP[Id]?.models ?? [];
        const isBuiltIn = defaultModels.some(
            (m) =>
                m.id.toLowerCase() === CleanModelId.toLowerCase() ||
                (m.id.includes("/") && m.id.split("/").slice(1).join("/").toLowerCase() === CleanModelId.toLowerCase())
        );
        if (isBuiltIn) {
            throw new Error(`Model '${CleanModelId}' is already available as a built-in model for this provider`);
        }

        // Check if model is locked upstream
        const matchingProviders = Array.from(registry.getAllProviders().values()).filter(
            (P) =>
                P.id.toLowerCase() === Id ||
                P.id.toLowerCase().startsWith(`${Id}_`) ||
                P.id.toLowerCase().startsWith(`${Id}-`)
        );
        for (const P of matchingProviders) {
            try {
                const list = P.listModels ? await P.listModels() : [];
                const found = list.find((m) => {
                    const bare = m.id.includes("/") ? m.id.split("/").slice(1).join("/") : m.id;
                    return m.id.toLowerCase() === CleanModelId.toLowerCase() || bare.toLowerCase() === CleanModelId.toLowerCase();
                });
                if (found && (found as ModelObject & { locked?: boolean }).locked) {
                    throw new Error(`Model '${CleanModelId}' is locked and cannot be added (paid plan required)`);
                }
            } catch (err) {
                if (err instanceof Error && err.message.includes("DEEPAI_AUTH_EXPIRED")) {
                    pruneDeepAIProvider(P.id);
                    throw new Error("DeepAI account session expired and was automatically removed. Please reconnect the account.");
                }
                if (err instanceof Error && err.message.includes("is locked")) throw err;
            }
        }

        addCustomModelDB(Id, CleanModelId);
        const FullId = `${providerAlias(Id)}/${CleanModelId}`;
        registry.clearModelsCache();
        return { id: FullId, object: "model", owned_by: providerAlias(Id) };
    }

    public static DeleteCustomModel(ProviderId: string, ModelId: string): void {
        const Id = ProviderId.toLowerCase();
        const Alias = providerAlias(Id).toLowerCase();
        let CleanModelId = ModelId;
        if (CleanModelId.toLowerCase().startsWith(`${Alias}/`)) {
            CleanModelId = CleanModelId.slice(Alias.length + 1);
        } else if (CleanModelId.toLowerCase().startsWith(`${Id}/`)) {
            CleanModelId = CleanModelId.slice(Id.length + 1);
        }

        let Deleted = deleteCustomModelDB(Id, CleanModelId);
        if (!Deleted && CleanModelId !== ModelId) {
            Deleted = deleteCustomModelDB(Id, ModelId);
        }
        if (!Deleted) {
            const providers = getAllProvidersDB();
            const matched = providers.filter(
                (P) =>
                    BaseIdOf(P.providerId || P.id).toLowerCase() === Id ||
                    (P.id && P.id.toLowerCase() === Id) ||
                    (P.providerId && P.providerId.toLowerCase() === Id) ||
                    (P.name && P.name.toLowerCase() === Id)
            );
            for (const p of matched) {
                const targetId = (p.providerId || p.id).toLowerCase();
                if (
                    deleteCustomModelDB(targetId, CleanModelId) ||
                    deleteCustomModelDB(targetId, ModelId)
                ) {
                    Deleted = true;
                    break;
                }
            }
        }
        if (!Deleted) throw new Error(`Custom model '${ModelId}' not found for '${ProviderId}'`);
        registry.clearModelsCache();
    }

    public static ListCustomModels(ProviderId: string): ModelObject[] {
        const Alias = providerAlias(ProviderId.toLowerCase());
        return getCustomModelsByProviderDB(ProviderId.toLowerCase()).map((Row) => ({
            id: `${Alias}/${Row.modelId}`,
            object: "model" as const,
            owned_by: Alias,
            custom: true
        }));
    }

    public static async ImportModels(ProviderId: string, ModelIds: string[]): Promise<{
        imported: ModelObject[];
        skipped: string[];
    }> {
        const Id = ProviderId.toLowerCase();
        if (
            !DEFAULT_PROVIDER_MAP[Id] &&
            !getAllProvidersDB().some((P) => BaseIdOf(P.providerId || P.id) === Id)
        ) {
            throw new Error(`Provider '${ProviderId}' not found`);
        }

        const Alias = providerAlias(Id);
        const imported: ModelObject[] = [];
        const skipped: string[] = [];

        // Build set of already existing / available model IDs for this provider
        const existingKeys = new Set<string>();
        for (const cm of getCustomModelsByProviderDB(Id)) {
            existingKeys.add(cm.modelId.toLowerCase());
            const bare = cm.modelId.includes("/") ? cm.modelId.split("/").slice(1).join("/") : cm.modelId;
            existingKeys.add(bare.toLowerCase());
        }
        const defaultModels = DEFAULT_PROVIDER_MAP[Id]?.models ?? [];
        for (const m of defaultModels) {
            existingKeys.add(m.id.toLowerCase());
            const bare = m.id.includes("/") ? m.id.split("/").slice(1).join("/") : m.id;
            existingKeys.add(bare.toLowerCase());
        }
        const matchingProviders = Array.from(registry.getAllProviders().values()).filter(
            (P) =>
                P.id.toLowerCase() === Id ||
                P.id.toLowerCase().startsWith(`${Id}_`) ||
                P.id.toLowerCase().startsWith(`${Id}-`)
        );
        const lockedKeys = new Set<string>();
        for (const P of matchingProviders) {
            try {
                const list = P.listModels ? await P.listModels() : [];
                for (const m of list) {
                    if ((m as ModelObject & { locked?: boolean }).locked) {
                        lockedKeys.add(m.id.toLowerCase());
                        const bare = m.id.includes("/") ? m.id.split("/").slice(1).join("/") : m.id;
                        lockedKeys.add(bare.toLowerCase());
                    } else {
                        existingKeys.add(m.id.toLowerCase());
                        const bare = m.id.includes("/") ? m.id.split("/").slice(1).join("/") : m.id;
                        existingKeys.add(bare.toLowerCase());
                    }
                }
            } catch (err) {
                if (err instanceof Error && err.message.includes("DEEPAI_AUTH_EXPIRED")) {
                    pruneDeepAIProvider(P.id);
                }
            }
        }

        for (const raw of ModelIds) {
            const Trimmed = raw.trim();
            if (!Trimmed) {
                skipped.push(raw);
                continue;
            }
            if (Trimmed.length > 200 || !/^[A-Za-z0-9._\-/: ]+$/.test(Trimmed)) {
                skipped.push(raw);
                continue;
            }

            // Strip alias prefix if present (e.g. "deepai/glm-5.3" -> "glm-5.3")
            let CleanModelId = Trimmed;
            if (CleanModelId.toLowerCase().startsWith(`${Alias.toLowerCase()}/`)) {
                CleanModelId = CleanModelId.slice(Alias.length + 1);
            } else if (CleanModelId.toLowerCase().startsWith(`${Id}/`)) {
                CleanModelId = CleanModelId.slice(Id.length + 1);
            }

            const bare = CleanModelId.includes("/") ? CleanModelId.split("/").slice(1).join("/") : CleanModelId;
            if (
                lockedKeys.has(CleanModelId.toLowerCase()) ||
                lockedKeys.has(bare.toLowerCase()) ||
                lockedKeys.has(Trimmed.toLowerCase())
            ) {
                // Locked model cannot be added / imported
                skipped.push(raw);
                continue;
            }

            if (
                existingKeys.has(CleanModelId.toLowerCase()) ||
                existingKeys.has(bare.toLowerCase()) ||
                existingKeys.has(Trimmed.toLowerCase())
            ) {
                // Already an available model or already imported
                skipped.push(raw);
                continue;
            }

            addCustomModelDB(Id, CleanModelId);
            existingKeys.add(CleanModelId.toLowerCase());
            existingKeys.add(bare.toLowerCase());
            imported.push({
                id: `${Alias}/${CleanModelId}`,
                object: "model",
                owned_by: Alias,
                custom: true
            });
        }

        if (imported.length > 0) {
            registry.clearModelsCache();
        }

        return { imported, skipped };
    }

    public static async FetchProviderModels(ProviderId: string): Promise<ModelObject[]> {
        const MatchingProviders = Array.from(registry.getAllProviders().values()).filter(
            (P) =>
                P.id === ProviderId ||
                P.id.startsWith(`${ProviderId}_`) ||
                P.id.startsWith(`${ProviderId}-`)
        );

        if (MatchingProviders.length === 0) {
            throw new Error(
                `No active connection found for provider '${ProviderId}'. Add an API key or connect an account first.`
            );
        }

        const allModels: ModelObject[] = [];
        for (const P of MatchingProviders) {
            try {
                const models = await registry.getProviderModels(P, true);
                allModels.push(...models);
            } catch {
                // skip providers that fail
            }
        }

        const deduped = new Map<string, ModelObject & { locked?: boolean }>();
        for (const m of allModels) {
            const bare = m.id.includes("/") ? m.id.split("/").slice(1).join("/") : m.id;
            const locked = (m as ModelObject & { locked?: boolean }).locked;
            const prev = deduped.get(bare.toLowerCase());
            // locked=false menang: cukup satu akun yang membuka model
            deduped.set(bare.toLowerCase(), {
                id: bare,
                object: "model",
                name: m.name || prev?.name,
                owned_by: providerAlias(ProviderId.toLowerCase()),
                locked: prev ? (prev.locked && Boolean(locked)) : Boolean(locked)
            });
        }

        return Array.from(deduped.values());
    }

    public static async VerifyConnection(Payload: VerifyProviderZod): Promise<{
        success: boolean;
        message: string;
        modelsCount?: number;
    }> {
        const Protocol = Payload.protocol || "openai";
        const RawBaseUrl = Payload.base_url?.trim() || "";
        const BaseUrl = RawBaseUrl.replace(/\/+$/, "");
        const ApiKey = Payload.api_key?.trim();

        if (BaseUrl) {
            try {
                await AssertPublicUrl(BaseUrl);
            } catch (Err) {
                return {
                    success: false,
                    message:
                        Err instanceof Error
                            ? `Target URL tidak diizinkan: ${Err.message}`
                            : "Format Endpoint Base URL tidak valid."
                };
            }
        }

        try {
            if (Protocol === "anthropic") {
                let TargetUrl: string;
                if (!BaseUrl) {
                    TargetUrl = "https://api.anthropic.com/v1/models";
                } else if (BaseUrl.endsWith("/v1")) {
                    TargetUrl = `${BaseUrl}/models`;
                } else {
                    TargetUrl = `${BaseUrl}/v1/models`;
                }

                const Headers: Record<string, string> = {
                    "User-Agent": "SRouter/1.0.0 (Node.js)",
                    Accept: "application/json",
                    "anthropic-version": "2023-06-01"
                };
                if (ApiKey) {
                    Headers["x-api-key"] = ApiKey;
                }

                const Res = await fetch(TargetUrl, {
                    method: "GET",
                    headers: Headers,
                    redirect: "follow",
                    signal: AbortSignal.timeout(8000)
                });

                if (Res.ok) {
                    const Data = (await Res.json().catch(() => ({}))) as {
                        data?: unknown[];
                    };
                    const Count = Array.isArray(Data?.data) ? Data.data.length : undefined;
                    return {
                        success: true,
                        message:
                            Count !== undefined
                                ? `Koneksi Anthropic valid! (${Count} model ditemukan)`
                                : "Koneksi Anthropic berhasil diverifikasi.",
                        modelsCount: Count
                    };
                }

                if (Res.status >= 300 && Res.status < 400) {
                    return {
                        success: false,
                        message: "Redirect tidak diikuti untuk verifikasi (potensi SSRF)."
                    };
                }

                if (Res.status === 401) {
                    return {
                        success: false,
                        message: "Autentikasi gagal: API key Anthropic tidak valid (HTTP 401)."
                    };
                }

                const ErrBody = await Res.text().catch(() => "");
                return {
                    success: false,
                    message: `Upstream error (HTTP ${Res.status}): ${Res.statusText || ErrBody.slice(0, 100)}`
                };
            }

            let TargetUrl: string;
            if (!BaseUrl) {
                TargetUrl = "https://api.openai.com/v1/models";
            } else if (BaseUrl.includes("deepseek.com")) {
                // DeepSeek web API: verify token by creating a session
                const VerifyRes = await fetch("https://chat.deepseek.com/api/v0/chat_session/create", {
                    method: "POST",
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${ApiKey}`,
                        Origin: "https://chat.deepseek.com",
                        Referer: "https://chat.deepseek.com/"
                    },
                    body: "{}",
                    redirect: "follow",
                    signal: AbortSignal.timeout(8000)
                });

                if (VerifyRes.ok) {
                    return {
                        success: true,
                        message: "DeepSeek token valid! (5 model tersedia)",
                        modelsCount: 5
                    };
                }

                if (VerifyRes.status === 401) {
                    return {
                        success: false,
                        message: "Autentikasi gagal: DeepSeek token salah atau kedaluwarsa (HTTP 401)."
                    };
                }

                const ErrBody = await VerifyRes.text().catch(() => "");
                return {
                    success: false,
                    message: `DeepSeek error (HTTP ${VerifyRes.status}): ${ErrBody.slice(0, 100)}`
                };
            } else if (BaseUrl.endsWith("/models")) {
                TargetUrl = BaseUrl;
            } else {
                TargetUrl = `${BaseUrl}/models`;
            }

            const Headers: Record<string, string> = {
                "User-Agent": "SRouter/1.0.0 (Node.js)",
                "Accept-Encoding": "identity",
                Accept: "application/json"
            };
            if (ApiKey) {
                Headers["Authorization"] = `Bearer ${ApiKey}`;
            }

            const Res = await fetch(TargetUrl, {
                method: "GET",
                headers: Headers,
                redirect: "follow",
                signal: AbortSignal.timeout(8000)
            });

            if (Res.ok) {
                const Data = (await Res.json().catch(() => ({}))) as {
                    data?: unknown[];
                };
                const Count = Array.isArray(Data?.data) ? Data.data.length : undefined;
                return {
                    success: true,
                    message:
                        Count !== undefined
                            ? `Koneksi OpenAI valid! (${Count} model ditemukan)`
                            : "Koneksi OpenAI berhasil diverifikasi.",
                    modelsCount: Count
                };
            }

            if (Res.status >= 300 && Res.status < 400) {
                return {
                    success: false,
                    message: "Redirect tidak diikuti untuk verifikasi (potensi SSRF)."
                };
            }

            if (Res.status === 401) {
                return {
                    success: false,
                    message: "Autentikasi gagal: API key salah atau kedaluwarsa (HTTP 401)."
                };
            }

            const ErrBody = await Res.text().catch(() => "");
            return {
                success: false,
                message: `Upstream error (HTTP ${Res.status}): ${Res.statusText || ErrBody.slice(0, 100)}`
            };
        } catch (Err) {
            const Msg = Err instanceof Error ? Err.message : "Tidak dapat terhubung ke endpoint.";
            return { success: false, message: `Gagal terhubung ke host: ${Msg}` };
        }
    }
}
