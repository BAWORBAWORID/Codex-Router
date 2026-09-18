import { db } from "./db.js";
import { randomUUID } from "node:crypto";
import { generateId, num, str } from "./row-utils.js";
function ParseAllowedModels(value) {
    if (!value)
        return null;
    try {
        const Parsed = JSON.parse(value);
        if (Array.isArray(Parsed) && Parsed.every((item) => typeof item === "string")) {
            return Parsed.length > 0 ? Parsed : null;
        }
    }
    catch { }
    return null;
}
export function getAllAPIKeysDB() {
    const Query = db.prepare("SELECT * FROM api_keys ORDER BY created_at DESC");
    const Rows = Query.all();
    return Rows.map(mapAPIKeyRow);
}
export function getAPIKeyByKeyDB(key) {
    const Query = db.prepare("SELECT * FROM api_keys WHERE key = ? AND enabled = 1");
    const Row = Query.get(key);
    if (!Row)
        return null;
    return mapAPIKeyRow(Row);
}
function mapAPIKeyRow(row) {
    return {
        id: row.id,
        key: row.key,
        name: row.name,
        enabled: Boolean(row.enabled),
        rate_limit: row.rate_limit ?? 0,
        quota_limit: row.quota_limit ?? 0,
        usage_tokens: row.usage_tokens ?? 0,
        credit_limit: row.credit_limit ?? 0,
        usage_cost: row.usage_cost ?? 0,
        allowed_models: ParseAllowedModels(row.allowed_models),
        created_at: row.created_at
    };
}
export function createAPIKeyDB(data) {
    const Id = generateId("key");
    const RandomHex = randomUUID().replace(/-/g, "").slice(0, 16);
    const Key = `sr-live-${RandomHex}`;
    const CreatedAt = Date.now();
    const AllowedModels = data.allowed_models && data.allowed_models.length > 0 ? data.allowed_models : null;
    const AllowedModelsJson = AllowedModels ? JSON.stringify(AllowedModels) : null;
    const RateLimit = data.rate_limit ?? data.rateLimit ?? 0;
    const QuotaLimit = data.quota_limit ?? data.quotaLimit ?? 0;
    const CreditLimit = data.credit_limit ?? data.creditLimit ?? 0;
    const Enabled = data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1;
    const Query = db.prepare(`
        INSERT INTO api_keys (id, key, name, enabled, rate_limit, quota_limit, usage_tokens, credit_limit, usage_cost, allowed_models, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?)
    `);
    Query.run(Id, Key, data.name, Enabled, RateLimit, QuotaLimit, CreditLimit, AllowedModelsJson, CreatedAt);
    return {
        id: Id,
        key: Key,
        name: data.name,
        enabled: Boolean(Enabled),
        rate_limit: RateLimit,
        quota_limit: QuotaLimit,
        usage_tokens: 0,
        credit_limit: CreditLimit,
        usage_cost: 0,
        allowed_models: AllowedModels,
        created_at: CreatedAt
    };
}
export function incrementAPIKeyUsageDB(keyId, tokens, cost = 0) {
    const Query = db.prepare("UPDATE api_keys SET usage_tokens = usage_tokens + ?, usage_cost = usage_cost + ? WHERE id = ?");
    Query.run(tokens, cost, keyId);
}
export function addCreditAPIKeyDB(id, amount) {
    const UpdateQuery = db.prepare("UPDATE api_keys SET credit_limit = credit_limit + ? WHERE id = ?");
    UpdateQuery.run(amount, id);
    const SelectQuery = db.prepare("SELECT * FROM api_keys WHERE id = ?");
    const Row = SelectQuery.get(id);
    if (!Row)
        return null;
    return mapAPIKeyRow(Row);
}
export function updateAPIKeyDB(id, data) {
    const SelectQuery = db.prepare("SELECT * FROM api_keys WHERE id = ?");
    const existing = SelectQuery.get(id);
    if (!existing)
        return null;
    const fields = [];
    const values = [];
    if (data.name !== undefined) {
        fields.push("name = ?");
        values.push(data.name.trim());
    }
    if (data.enabled !== undefined) {
        fields.push("enabled = ?");
        values.push(data.enabled ? 1 : 0);
    }
    const rateLimit = data.rate_limit ?? data.rateLimit;
    if (rateLimit !== undefined) {
        fields.push("rate_limit = ?");
        values.push(rateLimit);
    }
    const quotaLimit = data.quota_limit ?? data.quotaLimit;
    if (quotaLimit !== undefined) {
        fields.push("quota_limit = ?");
        values.push(quotaLimit);
    }
    const creditLimit = data.credit_limit ?? data.creditLimit;
    if (creditLimit !== undefined) {
        fields.push("credit_limit = ?");
        values.push(creditLimit);
    }
    if (data.allowed_models !== undefined) {
        fields.push("allowed_models = ?");
        const json = data.allowed_models && data.allowed_models.length > 0
            ? JSON.stringify(data.allowed_models)
            : null;
        values.push(json);
    }
    if (fields.length > 0) {
        values.push(id);
        const UpdateQuery = db.prepare(`UPDATE api_keys SET ${fields.join(", ")} WHERE id = ?`);
        UpdateQuery.run(...values);
    }
    const updatedRow = SelectQuery.get(id);
    return updatedRow ? mapAPIKeyRow(updatedRow) : null;
}
export function deleteAPIKeyDB(id) {
    const Query = db.prepare("DELETE FROM api_keys WHERE id = ?");
    const Result = Query.run(id);
    return num(Result.changes) > 0;
}
