import { db } from "./db.js";
import { generateId, num, optStr, str } from "./row-utils.js";
export function logRequestDB(entry) {
    const Id = generateId("log");
    const CreatedAt = Date.now();
    const Query = db.prepare(`
        INSERT INTO request_logs (id, api_key_id, provider_id, model, prompt_tokens, completion_tokens, total_tokens, status_code, latency_ms, cached_tokens, cache_creation_tokens, reasoning_tokens, estimated_cost, fallback_occurred, fallback_path, fallback_reason, resolved_model, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    Query.run(Id, entry.apiKeyId ?? null, entry.providerId, entry.model, entry.promptTokens, entry.completionTokens, entry.totalTokens, entry.statusCode, entry.latencyMs, entry.cachedTokens ?? 0, entry.cacheCreationTokens ?? 0, entry.reasoningTokens ?? 0, entry.estimatedCost ?? 0, entry.fallbackOccurred ? 1 : 0, entry.fallbackPath ?? null, entry.fallbackReason ?? null, entry.resolvedModel ?? null, CreatedAt);
    return {
        id: Id,
        ...entry,
        createdAt: CreatedAt
    };
}
export function getRecentLogsDB(limit = 50) {
    const Query = db.prepare("SELECT * FROM request_logs ORDER BY created_at DESC LIMIT ?");
    const Rows = Query.all(limit);
    return Rows.map(mapLogRow);
}
export function getUsageSummaryDB() {
    const Query = db.prepare(`
        SELECT 
            COUNT(*) as totalRequests,
            COALESCE(SUM(total_tokens), 0) as totalTokens,
            COALESCE(SUM(prompt_tokens), 0) as totalPromptTokens,
            COALESCE(SUM(completion_tokens), 0) as totalCompletionTokens,
            COALESCE(SUM(cached_tokens), 0) as totalCachedTokens,
            COALESCE(SUM(cache_creation_tokens), 0) as totalCacheCreationTokens,
            COALESCE(SUM(reasoning_tokens), 0) as totalReasoningTokens,
            COALESCE(SUM(estimated_cost), 0) as totalEstimatedCost
        FROM request_logs
    `);
    const Result = Query.get();
    return {
        totalRequests: num(Result?.totalRequests),
        totalTokens: num(Result?.totalTokens),
        totalPromptTokens: num(Result?.totalPromptTokens),
        totalCompletionTokens: num(Result?.totalCompletionTokens),
        totalCachedTokens: num(Result?.totalCachedTokens),
        totalCacheCreationTokens: num(Result?.totalCacheCreationTokens),
        totalReasoningTokens: num(Result?.totalReasoningTokens),
        totalEstimatedCost: num(Result?.totalEstimatedCost),
        totalInputTokens: num(Result?.totalPromptTokens),
        totalOutputTokens: num(Result?.totalCompletionTokens)
    };
}
export function getProviderUsageSummaryDB(providerId) {
    const Query = db.prepare(`
        SELECT 
            COUNT(*) as totalRequests,
            COALESCE(SUM(total_tokens), 0) as totalTokens,
            COALESCE(SUM(prompt_tokens), 0) as totalPromptTokens,
            COALESCE(SUM(completion_tokens), 0) as totalCompletionTokens,
            COALESCE(SUM(cached_tokens), 0) as totalCachedTokens,
            COALESCE(SUM(cache_creation_tokens), 0) as totalCacheCreationTokens,
            COALESCE(SUM(reasoning_tokens), 0) as totalReasoningTokens,
            COALESCE(SUM(estimated_cost), 0) as totalEstimatedCost
        FROM request_logs
        WHERE provider_id = ?
    `);
    const Result = Query.get(providerId);
    return {
        totalRequests: num(Result?.totalRequests),
        totalTokens: num(Result?.totalTokens),
        totalPromptTokens: num(Result?.totalPromptTokens),
        totalCompletionTokens: num(Result?.totalCompletionTokens),
        totalCachedTokens: num(Result?.totalCachedTokens),
        totalCacheCreationTokens: num(Result?.totalCacheCreationTokens),
        totalReasoningTokens: num(Result?.totalReasoningTokens),
        totalEstimatedCost: num(Result?.totalEstimatedCost),
        totalInputTokens: num(Result?.totalPromptTokens),
        totalOutputTokens: num(Result?.totalCompletionTokens)
    };
}
export function getProviderModelUsageDB(providerId) {
    const Query = db.prepare(`
        SELECT 
            model,
            COUNT(*) as totalRequests,
            COALESCE(SUM(total_tokens), 0) as totalTokens,
            COALESCE(SUM(prompt_tokens), 0) as promptTokens,
            COALESCE(SUM(completion_tokens), 0) as completionTokens,
            COALESCE(SUM(cached_tokens), 0) as cachedTokens,
            COALESCE(SUM(estimated_cost), 0) as estimatedCost,
            MAX(created_at) as lastUsedAt
        FROM request_logs
        WHERE provider_id = ?
        GROUP BY model
        ORDER BY lastUsedAt DESC
    `);
    const Rows = Query.all(providerId);
    return Rows.map((row) => ({
        model: row.model,
        totalRequests: row.totalRequests,
        totalTokens: row.totalTokens,
        promptTokens: row.promptTokens,
        completionTokens: row.completionTokens,
        cachedTokens: row.cachedTokens,
        estimatedCost: row.estimatedCost,
        lastUsedAt: row.lastUsedAt
    }));
}
export function getUsageByModelDB() {
    const Query = db.prepare(`
        SELECT 
            model,
            COUNT(*) as totalRequests,
            COALESCE(SUM(prompt_tokens), 0) as totalInputTokens,
            COALESCE(SUM(completion_tokens), 0) as totalOutputTokens,
            COALESCE(SUM(cached_tokens), 0) as totalCachedTokens,
            COALESCE(SUM(estimated_cost), 0) as estCost
        FROM request_logs
        GROUP BY model
        ORDER BY totalRequests DESC
    `);
    const Rows = Query.all();
    return Rows.map((row) => ({
        model: row.model,
        totalRequests: row.totalRequests,
        totalInputTokens: row.totalInputTokens,
        totalOutputTokens: row.totalOutputTokens,
        totalCachedTokens: row.totalCachedTokens,
        estCost: row.estCost
    }));
}
export function deleteLogsByModelDB(model) {
    const Query = db.prepare("DELETE FROM request_logs WHERE model = ?");
    Query.run(model);
}
export function deleteLogsByProviderDB(providerId) {
    const Query = db.prepare("DELETE FROM request_logs WHERE provider_id = ?");
    Query.run(providerId);
}
function mapLogRow(row) {
    return {
        id: str(row.id),
        apiKeyId: optStr(row.api_key_id),
        providerId: str(row.provider_id),
        model: str(row.model),
        promptTokens: num(row.prompt_tokens),
        completionTokens: num(row.completion_tokens),
        totalTokens: num(row.total_tokens),
        statusCode: num(row.status_code),
        latencyMs: num(row.latency_ms),
        cachedTokens: num(row.cached_tokens),
        cacheCreationTokens: num(row.cache_creation_tokens),
        reasoningTokens: num(row.reasoning_tokens),
        estimatedCost: num(row.estimated_cost),
        fallbackOccurred: Boolean(row.fallback_occurred),
        fallbackPath: optStr(row.fallback_path),
        fallbackReason: optStr(row.fallback_reason),
        resolvedModel: optStr(row.resolved_model),
        createdAt: num(row.created_at)
    };
}
