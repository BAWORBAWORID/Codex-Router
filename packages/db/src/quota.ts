import { CODEBUDDY_CN_DOMAIN, CODEBUDDY_CN_USER_AGENT, isProviderBaseId } from "@codex/constants";
import type {
    LiveModelQuotaItem,
    ProviderQuotaAccount,
    ProviderUsageMetric,
    QuotaResponse
} from "@codex/types";
import { getProviderModelUsageDB } from "./logs.js";
import { getAllProvidersDB } from "./providers.js";
import { num, str } from "./row-utils.js";

function formatResetIn(resetTimeStr?: string): string {
    if (!resetTimeStr) return "24h 0m";
    const ResetTime = new Date(resetTimeStr).getTime();
    const Now = Date.now();
    const DiffMs = ResetTime - Now;
    if (DiffMs <= 0) return "0m";
    const Days = Math.floor(DiffMs / (1000 * 60 * 60 * 24));
    const Hours = Math.floor(DiffMs / (1000 * 60 * 60));
    if (Days > 0) {
        return `${Days}d ${Hours - Days * 24}h`;
    }
    const Minutes = Math.floor((DiffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (Hours > 0) {
        return `${Hours}h ${Minutes}m`;
    }
    return `${Minutes}m`;
}

interface CloudCodeFetchAvailableModelsResponse {
    models?: Record<
        string,
        {
            displayName?: string;
            quotaInfo?: {
                remainingFraction?: number;
                resetTime?: string;
            };
        }
    >;
}

interface AntigravityQuotaModelDef {
    id: string;
    name: string;
    upstreamBaseId: string;
}

const ALL_ANTIGRAVITY_QUOTA_MODELS: AntigravityQuotaModelDef[] = [
    { id: "gemini-3.6-flash-high", name: "Gemini 3.6 Flash (High)", upstreamBaseId: "gemini-3-flash" },
    { id: "gemini-3.6-flash-medium", name: "Gemini 3.6 Flash (Medium)", upstreamBaseId: "gemini-3-flash" },
    { id: "gemini-3.6-flash-low", name: "Gemini 3.6 Flash (Low)", upstreamBaseId: "gemini-3-flash" },
    { id: "gemini-3.5-flash-high", name: "Gemini 3.5 Flash (High)", upstreamBaseId: "gemini-3-flash" },
    { id: "gemini-3.5-flash-medium", name: "Gemini 3.5 Flash (Medium)", upstreamBaseId: "gemini-3-flash" },
    { id: "gemini-3.5-flash-low", name: "Gemini 3.5 Flash (Low)", upstreamBaseId: "gemini-3-flash" },
    { id: "gemini-3.5-flash-extra-low", name: "Gemini 3.5 Flash (Extra Low)", upstreamBaseId: "gemini-3-flash" },
    { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash Lite", upstreamBaseId: "gemini-3.5-flash-lite" },
    { id: "gemini-3.1-pro-high", name: "Gemini 3.1 Pro (High)", upstreamBaseId: "gemini-2.5-pro" },
    { id: "gemini-3.1-pro-low", name: "Gemini 3.1 Pro (Low)", upstreamBaseId: "gemini-2.5-pro" },
    { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite", upstreamBaseId: "gemini-3.1-flash-lite" },
    { id: "gemini-3.1-flash-image", name: "Gemini 3.1 Flash (Image)", upstreamBaseId: "gemini-3.1-flash-image" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash", upstreamBaseId: "gemini-3-flash" },
    { id: "gemini-3-flash-agent", name: "Gemini 3 Flash (Agent)", upstreamBaseId: "gemini-3-flash" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", upstreamBaseId: "gemini-2.5-pro" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", upstreamBaseId: "gemini-2.5-flash" },
    { id: "gemini-2.5-flash-thinking", name: "Gemini 2.5 Flash (Thinking)", upstreamBaseId: "gemini-2.5-flash-thinking" },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", upstreamBaseId: "gemini-2.5-flash-lite" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6 (Thinking)", upstreamBaseId: "claude-sonnet-4-6" },
    { id: "claude-opus-4-6-thinking", name: "Claude Opus 4.6 (Thinking)", upstreamBaseId: "claude-opus-4-6-thinking" },
    { id: "gpt-oss-120b-medium", name: "GPT-OSS 120B (Medium)", upstreamBaseId: "gpt-oss-120b-medium" },
    { id: "gemini-3.8", name: "Gemini 3.8", upstreamBaseId: "gemini-3.8-flash-tiered" },
    { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", upstreamBaseId: "gemini-3.8-flash-tiered" },
    { id: "gemini-3.8-flash-tiered", name: "Gemini 3.8 Flash (Tiered)", upstreamBaseId: "gemini-3.8-flash-tiered" },
    { id: "gemini-3.8-flash-high", name: "Gemini 3.8 Flash (High)", upstreamBaseId: "gemini-3.8-flash-high" },
    { id: "gemini-3.8-flash-medium", name: "Gemini 3.8 Flash (Medium)", upstreamBaseId: "gemini-3.8-flash-medium" },
    { id: "gemini-3.8-flash-low", name: "Gemini 3.8 Flash (Low)", upstreamBaseId: "gemini-3.8-flash-low" }
];

export async function fetchAntigravityLiveQuota(
    providerId: string,
    accountName: string,
    accessToken: string,
    enabled = true
): Promise<ProviderQuotaAccount> {
    if (!accessToken || !(accessToken.startsWith("ya29.") || accessToken.length > 20)) {
        throw new Error("Antigravity quota requires a valid access token");
    }

    const Res = await fetch("https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "User-Agent": process.env.ANTIGRAVITY_UA || "antigravity/cli/1.5.9",
            "x-goog-api-client": "gl-node/18.0.0 gd/1.0.0"
        },
        body: JSON.stringify({})
    });

    if (!Res.ok) {
        throw new Error(`Antigravity quota fetch failed: HTTP ${Res.status}`);
    }

    const Data = (await Res.json()) as CloudCodeFetchAvailableModelsResponse;
    if (!Data.models || Object.keys(Data.models).length === 0) {
        throw new Error("Antigravity quota fetch returned no models");
    }

    const Quotas: LiveModelQuotaItem[] = ALL_ANTIGRAVITY_QUOTA_MODELS.map((def) => {
        const item = Data.models?.[def.upstreamBaseId] || Data.models?.[def.id];
        const RemainingFraction = item?.quotaInfo?.remainingFraction ?? 1.0;
        const PercentageValue = Math.round(RemainingFraction * 100);
        const Limit = 1000;
        const Used = Math.round((1 - RemainingFraction) * Limit);
        const ResetIn = formatResetIn(item?.quotaInfo?.resetTime);

        let Status: "ok" | "warning" | "exhausted" = "ok";
        if (PercentageValue <= 5) Status = "exhausted";
        else if (PercentageValue <= 20) Status = "warning";

        return {
            name: def.name,
            used: Used,
            limit: Limit,
            percentage: `${PercentageValue}%`,
            percentageValue: PercentageValue,
            resetIn: ResetIn,
            resetTime: item?.quotaInfo?.resetTime,
            status: Status
        };
    });

    return {
        id: providerId,
        provider: "Antigravity",
        providerId: "antigravity",
        account: accountName,
        enabled,
        quotaType: "live_provider_quota",
        totalQuotas: Quotas.length,
        quotas: Quotas
    };
}

interface CodeBuddyCNAccount {
    PackageName?: string;
    SubProductName?: string;
    CycleStartTime?: string;
    CycleEndTime?: string;
    DeductionEndTime?: number;
    CycleCapacityUsed?: number;
    CycleCapacityUsedPrecise?: string;
    CycleCapacitySize?: number;
    CycleCapacitySizePrecise?: string;
    CapacityUsed?: number;
    CapacityUsedPrecise?: string;
    CapacitySize?: number;
    CapacitySizePrecise?: string;
}

const CN_REFILL_GAP_MS = 2 * 24 * 60 * 60 * 1000;

export async function fetchCodeBuddyCNLiveQuota(
    providerId: string,
    accountName: string,
    accessToken: string,
    enabled = true
): Promise<ProviderQuotaAccount> {
    if (!accessToken) {
        throw new Error("CodeBuddy CN quota requires an access token");
    }

    const Res = await fetch("https://copilot.tencent.com/v2/billing/meter/get-user-resource", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": CODEBUDDY_CN_USER_AGENT,
            "X-Product": "SaaS",
            "X-IDE-Type": "CLI",
            "X-IDE-Name": "CLI",
            "X-Domain": CODEBUDDY_CN_DOMAIN,
            "x-requested-with": "XMLHttpRequest",
            "x-codebuddy-request": "1"
        },
        body: "{}"
    });

    if (!Res.ok) {
        throw new Error(`CodeBuddy CN quota fetch failed: HTTP ${Res.status}`);
    }

    const Json = (await Res.json()) as {
        code?: number;
        msg?: string;
        data?: { Response?: { Data?: { Accounts?: CodeBuddyCNAccount[] } } };
    };
    if (Json.code !== 0) {
        throw new Error(`CodeBuddy CN quota error: ${Json.msg || "unknown"}`);
    }

    const Accounts = Json.data?.Response?.Data?.Accounts ?? [];
    if (Accounts.length === 0) {
        throw new Error("CodeBuddy CN quota fetch returned no credit packages");
    }

    const cycleEndMs = (acc: CodeBuddyCNAccount): number => {
        const T = acc.CycleEndTime ? new Date(acc.CycleEndTime).getTime() : NaN;
        return Number.isFinite(T) ? T : Number.POSITIVE_INFINITY;
    };
    const isRefill = (acc: CodeBuddyCNAccount): boolean => {
        const Ce = cycleEndMs(acc);
        const De = num(acc.DeductionEndTime);
        return Number.isFinite(Ce) && Number.isFinite(De) && De - Ce > CN_REFILL_GAP_MS;
    };
    const byExpiry = (a: CodeBuddyCNAccount, b: CodeBuddyCNAccount) =>
        cycleEndMs(a) - cycleEndMs(b);

    const Refills = Accounts.filter(isRefill).sort(byExpiry);
    const Bonuses = Accounts.filter((a) => !isRefill(a)).sort(byExpiry);

    const toItem = (
        name: string,
        used: number,
        total: number,
        resetTime?: string
    ): LiveModelQuotaItem => {
        const RemainingFraction = total > 0 ? (total - used) / total : 1;
        return {
            name,
            used: Math.round(used * 100) / 100,
            limit: Math.round(total * 100) / 100,
            percentage: total > 0 ? `${Math.round((used / total) * 100)}%` : "0%",
            percentageValue: total > 0 ? Math.round((used / total) * 100) : 0,
            resetIn: formatResetIn(resetTime),
            resetTime,
            status:
                RemainingFraction <= 0.05
                    ? "exhausted"
                    : RemainingFraction <= 0.2
                      ? "warning"
                      : "ok"
        };
    };

    const parseNum = (precise?: string, plain?: number): number => {
        return num(precise ?? plain);
    };

    const Quotas: LiveModelQuotaItem[] = [];
    const SeenCadence: Record<string, number> = {};
    for (const acc of Refills) {
        const CycleStartMs = acc.CycleStartTime ? new Date(acc.CycleStartTime).getTime() : NaN;
        const CycleDays = (cycleEndMs(acc) - CycleStartMs) / 86400000;
        const Base =
            Number.isFinite(CycleDays) && CycleDays <= 1.5
                ? "Daily"
                : Number.isFinite(CycleDays) && CycleDays <= 10
                  ? "Weekly"
                  : "Monthly";
        SeenCadence[Base] = (SeenCadence[Base] ?? 0) + 1;
        const Name = SeenCadence[Base]! > 1 ? `${Base} ${SeenCadence[Base]}` : Base;
        Quotas.push(
            toItem(
                Name,
                parseNum(acc.CycleCapacityUsedPrecise, acc.CycleCapacityUsed),
                parseNum(acc.CycleCapacitySizePrecise, acc.CycleCapacitySize),
                acc.CycleEndTime
            )
        );
    }
    Bonuses.forEach((acc, i) => {
        Quotas.push(
            toItem(
                `Bonus Pack ${i + 1}`,
                parseNum(acc.CapacityUsedPrecise, acc.CapacityUsed),
                parseNum(acc.CapacitySizePrecise, acc.CapacitySize),
                acc.CycleEndTime
            )
        );
    });

    const BasePkg = Refills[0] ?? Accounts[0] ?? {};
    const Plan = BasePkg.PackageName || BasePkg.SubProductName;

    return {
        id: providerId,
        provider: Plan ? `CodeBuddy CN (${Plan})` : "CodeBuddy CN",
        providerId: "codebuddy-cn",
        account: accountName,
        enabled,
        quotaType: "live_provider_quota",
        totalQuotas: Quotas.length,
        quotas: Quotas
    };
}

export async function fetchFreebuffLiveQuota(
    providerId: string,
    accountName: string,
    token: string,
    enabled = true
): Promise<ProviderQuotaAccount> {
    if (!token) {
        throw new Error("Freebuff quota requires a valid access token");
    }

    const res = await fetch("https://www.codebuff.com/api/v1/usage", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "Freebuff/0.2.36 (Linux x64)"
        },
        body: JSON.stringify({
            fingerprintId: "enhanced-ZkMpsbmc8OVlDnAOqk9RGZzWv52kg6AZaZgp5ICGuqI"
        })
    });

    if (!res.ok) {
        throw new Error(`Freebuff quota fetch failed: HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
        type?: string;
        usage?: number;
        remainingBalance?: number;
        next_quota_reset?: string;
        balanceBreakdown?: Record<string, number>;
    };

    const remaining = typeof data.remainingBalance === "number" ? data.remainingBalance : 0;
    const usage = typeof data.usage === "number" ? data.usage : 0;
    const total = remaining + usage > 0 ? remaining + usage : 100;
    const used = Math.max(0, total - remaining);
    const percentageVal = Math.round((remaining / total) * 100);

    const quotas: LiveModelQuotaItem[] = [
        {
            name: "Credits Balance",
            used: Math.round(used * 100) / 100,
            limit: Math.round(total * 100) / 100,
            percentage: `${percentageVal}%`,
            percentageValue: percentageVal,
            resetIn: formatResetIn(data.next_quota_reset),
            resetTime: data.next_quota_reset,
            status: remaining <= 0 ? "exhausted" : percentageVal <= 20 ? "warning" : "ok"
        }
    ];

    const UsageRows = getProviderModelUsageDB(providerId);
    const UsageMetrics: ProviderUsageMetric[] = UsageRows.map((row) => ({
        model: row.model,
        totalRequests: row.totalRequests,
        totalTokens: row.totalTokens,
        promptTokens: row.promptTokens,
        completionTokens: row.completionTokens,
        lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt).toISOString() : null
    }));

    return {
        id: providerId,
        provider: "Freebuff",
        providerId: "freebuff",
        account: accountName,
        enabled,
        quotaType: "live_provider_quota",
        totalQuotas: quotas.length,
        quotas,
        usageMetrics: UsageMetrics
    };
}

export async function getProviderQuotaAccount(p: {
    id: string;
    providerId: string;
    name: string;
    apiKey?: string;
    accessToken?: string;
    enabled: boolean;
}): Promise<ProviderQuotaAccount> {
    const IsAntigravity =
        isProviderBaseId(p.providerId, "antigravity") || isProviderBaseId(p.id, "antigravity");
    const IsOpenAICodex =
        isProviderBaseId(p.providerId, "openai_codex") || isProviderBaseId(p.id, "openai_codex");
    const IsOpenAI = isProviderBaseId(p.providerId, "openai") || isProviderBaseId(p.id, "openai");
    const IsAnthropic =
        isProviderBaseId(p.providerId, "anthropic") || isProviderBaseId(p.id, "anthropic");
    const IsCodeBuddyCN =
        isProviderBaseId(p.providerId, "codebuddy-cn") || isProviderBaseId(p.id, "codebuddy-cn");
    const IsCodeBuddy =
        !IsCodeBuddyCN &&
        (isProviderBaseId(p.providerId, "codebuddy") || isProviderBaseId(p.id, "codebuddy"));
    const IsFreebuff =
        isProviderBaseId(p.providerId, "freebuff") || isProviderBaseId(p.id, "freebuff");

    const Token = p.accessToken || p.apiKey || "";

    if (IsCodeBuddy) {
        throw new Error("CodeBuddy (international) does not expose a live quota endpoint");
    }

    if (IsFreebuff && Token) {
        try {
            return await fetchFreebuffLiveQuota(
                p.id,
                p.name || "Freebuff Account",
                Token,
                p.enabled
            );
        } catch {
            // Fall back to local usage_logged if upstream fetch fails
        }
    }

    if (IsCodeBuddyCN) {
        return await fetchCodeBuddyCNLiveQuota(
            p.id,
            p.name || "CodeBuddy CN Account",
            Token,
            p.enabled
        );
    }

    if (IsAntigravity) {
        return await fetchAntigravityLiveQuota(
            p.id,
            p.name || "seaavey@gmail.com",
            Token,
            p.enabled
        );
    }

    const UsageRows = getProviderModelUsageDB(p.id);
    const UsageMetrics: ProviderUsageMetric[] = UsageRows.map((row) => ({
        model: row.model,
        totalRequests: row.totalRequests,
        totalTokens: row.totalTokens,
        promptTokens: row.promptTokens,
        completionTokens: row.completionTokens,
        lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt).toISOString() : null
    }));

    let ProviderName = p.name || p.providerId || p.id;
    if (IsOpenAICodex) ProviderName = "OpenAI Codex";
    else if (IsOpenAI) ProviderName = "OpenAI";
    else if (IsAnthropic) ProviderName = "Anthropic";

    return {
        id: p.id,
        provider: ProviderName,
        providerId: p.providerId || p.id,
        account: p.name || `${ProviderName} Account`,
        enabled: p.enabled,
        quotaType: "usage_logged",
        usageMetrics: UsageMetrics
    };
}

export async function getQuotaSummaryDB(): Promise<QuotaResponse> {
    const DbProviders = getAllProvidersDB();

    // Build a map of providerId -> connected count from actual connections
    const allConnections = getAllProvidersDB().filter((c) => !c.providerSpecificData?.__seed__);
    const connectedCountByProvider: Record<string, number> = {};
    for (const conn of getAllProvidersDB()) {
        if (conn.enabled && !conn.providerSpecificData?.__seed__) {
            const baseId = conn.providerId || conn.id;
            connectedCountByProvider[baseId] = (connectedCountByProvider[baseId] || 0) + 1;
        }
    }

    const ProviderAccounts: ProviderQuotaAccount[] = [];
    for (const p of DbProviders) {
        try {
            // Only include providers that have active connections
            const baseId = p.providerId || p.id;
            const connectedCount = connectedCountByProvider[baseId] ?? 0;
            if (connectedCount === 0) continue;

            const Account = await getProviderQuotaAccount(p);
            ProviderAccounts.push(Account);
        } catch {
            // Skip providers whose quota cannot be fetched
        }
    }

    return {
        object: "quota",
        totalAccounts: ProviderAccounts.length,
        providers: ProviderAccounts
    };
}
