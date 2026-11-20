import { providerTypeForAlias } from "@codex/constants";
import { getAllProvidersDB, updateProviderTokensDB, getProviderByIdDB, deleteProviderDB, updateProviderSpecificDataDB } from "@codex/db";
import type { AIProvider, ProviderConfig } from "@codex/types";
import { authProviderHandlers } from "@/services/authHandlers.js";
import { registry } from "./registry.js";

// Refresh tokens before they expire — lead time in ms
const REFRESH_LEAD_MS = 5 * 60 * 1000; // 5 min before expiry
// Interval for the background sweep
const SWEEP_INTERVAL_MS = 60 * 1000; // every 1 min
// Prevent concurrent refreshes of the same account (sweeper + lazy request race)
const inFlightRefreshes = new Map<string, Promise<RefreshResult>>();

export interface RefreshResult {
    success: boolean;
    error?: string;
    refreshedAt?: number;
}

type OAuthClient = {
    refreshTokens(
        refreshToken: string
    ): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }>;
};

/**
 * Resolve the OAuth client class for a provider type from the shared auth-provider handlers.
 * Codex → OpenAICodexOAuth, antigravity → AntigravityOAuth. Providers without an oauthClass
 * (commandcode, anthropic) and the stale "claude" alias resolve to null → no-op.
 */
function getOAuthClient(providerType: string): OAuthClient | null {
    const handler = authProviderHandlers[providerType];
    if (!handler?.oauthClass) return null;
    return new handler.oauthClass();
}

/**
 * Determine if a provider account is due for refresh.
 * - No refresh token → never due
 * - No expiry known → refresh if never refreshed OR last refresh > 12h ago (safety)
 * - Expiry known → refresh when within REFRESH_LEAD_MS
 */
export function isDueForRefresh(provider: ProviderConfig, now = Date.now()): boolean {
    if (!provider.refreshToken) return false;
    if (!provider.accessToken) return true;
    if (provider.tokenExpiresAt) {
        return now >= provider.tokenExpiresAt - REFRESH_LEAD_MS;
    }
    // No expiry known — refresh if never refreshed or stale (> 12h)
    if (!provider.lastRefreshedAt) return true;
    return now - provider.lastRefreshedAt > 12 * 60 * 60 * 1000;
}

/**
 * Refresh a single provider's access token.
 * 1. Call the OAuth refresh endpoint
 * 2. Update DB (access_token, refresh_token, token_expires_at, last_refreshed_at)
 * 3. Update the live executor instance in the registry
 */
export async function refreshProviderToken(providerId: string): Promise<RefreshResult> {
    const existing = inFlightRefreshes.get(providerId);
    if (existing) return existing;

    const refresh = refreshProviderTokenOnce(providerId).finally(() => {
        inFlightRefreshes.delete(providerId);
    });
    inFlightRefreshes.set(providerId, refresh);
    return refresh;
}

async function refreshProviderTokenOnce(providerId: string): Promise<RefreshResult> {
    const provider = getProviderByIdDB(providerId);
    if (!provider) {
        return { success: false, error: `Provider ${providerId} not found` };
    }
    if (!provider.refreshToken) {
        return { success: false, error: `Provider ${providerId} has no refresh token` };
    }

    const oauthClient = getOAuthClient(provider.providerId);
    if (!oauthClient) {
        return {
            success: false,
            error: `No OAuth client for provider type ${provider.providerId}`
        };
    }

    try {
        if (typeof oauthClient.refreshTokens !== "function") {
            return {
                success: false,
                error: "Provider does not support token refresh"
            };
        }
        const tokens = await oauthClient.refreshTokens(provider.refreshToken);
        const refreshedAt = Date.now();
        const expiresAt = tokens.expiresIn ? refreshedAt + tokens.expiresIn * 1000 : undefined;
        const nextRefreshToken = tokens.refreshToken ?? provider.refreshToken;

        updateProviderTokensDB({
            id: providerId,
            accessToken: tokens.accessToken,
            refreshToken: nextRefreshToken,
            tokenExpiresAt: expiresAt,
            lastRefreshedAt: refreshedAt
        });

        const instance = registry.getProvider(providerId) as
            (AIProvider & { updateToken?: (at: string, rt?: string) => void }) | undefined;
        instance?.updateToken?.(tokens.accessToken, nextRefreshToken);

        return { success: true, refreshedAt };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

/**
 * Sweep all OAuth providers and refresh accounts that are due.
 * Runs on an interval; also callable manually (e.g. after startup).
 */

/**
 * Check if a DeepAI session token is expired (401 from upstream).
 * If expired, delete the provider account from SQLite and unregister it from the live registry.
 */
/**
 * Check health/status of an Antigravity account directly against Google CloudCode.
 * Detects 403 "Terms of Service" -> suspended, 403 "Verify your account" -> verify_required.
 */
export async function checkAntigravityAccountStatus(provider: ProviderConfig): Promise<void> {
    const token = provider.accessToken;
    if (!token) return;

    try {
        const res = await fetch("https://daily-cloudcode-pa.googleapis.com/v1internal:generateContent", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "antigravity/cli/1.5.11",
                Authorization: `Bearer ${token}`,
                "x-goog-api-client": "gl-node/18.0.0 gd/1.0.0"
            },
            body: JSON.stringify({
                project: "aicode-consumers",
                model: "gemini-2.5-flash",
                userAgent: "antigravity",
                requestType: "agent",
                requestId: "health-check-probe",
                request: {
                    contents: [{ role: "user", parts: [{ text: "ping" }] }],
                    generationConfig: { maxOutputTokens: 2 }
                }
            }),
            signal: AbortSignal.timeout(8000)
        });

        let accountStatus = "active";
        let accountStatusReason = "Healthy";

        if (res.status === 403) {
            const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
            const msg = data.error?.message || "";
            if (/violation of Terms of Service/i.test(msg)) {
                accountStatus = "suspended";
                accountStatusReason = "Terms of Service violation";
            } else if (/Verify your account/i.test(msg)) {
                accountStatus = "verify_required";
                accountStatusReason = "Verify your account to continue";
            } else {
                accountStatus = "suspended";
                accountStatusReason = msg || "Permission denied (403)";
            }
        }

        updateProviderSpecificDataDB(provider.id, { accountStatus, accountStatusReason });
    } catch {
        // network error, leave unchanged
    }
}

export async function checkAndPruneDeepAIAccount(provider: ProviderConfig): Promise<boolean> {
    const token = provider.accessToken || provider.apiKey;
    if (!token) return false;

    try {
        const res = await fetch("https://api.deepai.org/deepai_code/models", {
            method: "GET",
            headers: {
                accept: "application/json",
                "user-agent": "deepai-gateway/1.0",
                "X-DeepAI-Code-Theos": "4",
                "X-DeepAI-Code-Instance": "a1b2c3d4e5f67890a1b2c3d4e5f67890",
                "Api-Key": token
            },
            signal: AbortSignal.timeout(6000)
        });

        if (res.status === 401) {
            pruneDeepAIProvider(provider.id, provider.name);
            return true;
        }
    } catch (err) {
        // Network error, don't delete on transient failure
    }
    return false;
}

/**
 * Immediately delete an expired DeepAI provider from DB and live registry.
 * Safe to call multiple times.
 */
export function pruneDeepAIProvider(providerId: string, providerName?: string): void {
    if (providerId === "deepai") return; // never delete seed/base
    console.warn(`[TokenRefresh] DeepAI account ${providerName || providerId} (${providerId}) is EXPIRED (HTTP 401). Auto-deleting...`);
    deleteProviderDB(providerId);
    registry.unregisterProvider(providerId);
}

export async function sweepExpiredTokens(): Promise<RefreshResult[]> {
    const providers = getAllProvidersDB().filter((p) => p.enabled && p.refreshToken);
    const results: RefreshResult[] = [];

    // Auto-prune expired DeepAI accounts & check Antigravity status
    const allProviders = getAllProvidersDB().filter((p) => p.enabled);
    for (const p of allProviders) {
        if (p.providerId === "deepai" && p.id !== "deepai") {
            await checkAndPruneDeepAIAccount(p);
        } else if (p.providerId === "antigravity" && p.refreshToken) {
            await checkAntigravityAccountStatus(p);
        }
    }

    for (const provider of providers) {
        if (!isDueForRefresh(provider)) continue;
        const result = await refreshProviderToken(provider.id);
        results.push({ ...result, ...{ provider: provider.id } } as RefreshResult & {
            provider: string;
        });
        if (result.success) {
            console.log(`[TokenRefresh] Refreshed ${provider.id} (${provider.providerId})`);
        } else {
            console.warn(
                `[TokenRefresh] Refresh failed for ${provider.id} (${provider.providerId}): ${result.error}`
            );
        }
    }

    return results;
}

let sweepTimer: ReturnType<typeof setInterval> | null = null;
let startupTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Start the background token refresh sweeper.
 */
export function startTokenRefreshSweeper(intervalMs = SWEEP_INTERVAL_MS): void {
    if (sweepTimer) return;
    console.log(`[TokenRefresh] Starting sweeper (every ${intervalMs / 1000}s)`);
    startupTimer = setTimeout(() => {
        startupTimer = null;
        void sweepExpiredTokens();
    }, 5_000);
    startupTimer.unref?.();
    sweepTimer = setInterval(() => {
        void sweepExpiredTokens();
    }, intervalMs);
    sweepTimer.unref?.();
}

/**
 * Stop the background sweeper (e.g. for tests).
 */
export function stopTokenRefreshSweeper(): void {
    if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
    }
    if (sweepTimer) {
        clearInterval(sweepTimer);
        sweepTimer = null;
    }
}

/**
 * Lazy refresh all accounts behind a model alias before registry routing.
 * This matters for multi-account providers: registry picks an account only after this hook.
 */
export async function ensureFreshToken(alias: string): Promise<void> {
    const providerType = providerTypeForAlias(alias);
    if (!providerType) return;

    const due = getAllProvidersDB().filter(
        (provider) =>
            provider.enabled && provider.providerId === providerType && isDueForRefresh(provider)
    );
    await Promise.all(due.map((provider) => refreshProviderToken(provider.id)));
}
