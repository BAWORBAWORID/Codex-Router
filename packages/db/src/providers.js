import { db } from "./db.js";
import { num, optStr, str } from "./row-utils.js";
export function getAllProvidersDB() {
    const Query = db.prepare("SELECT * FROM providers ORDER BY created_at DESC");
    const Rows = Query.all();
    return Rows.map(mapProviderRow);
}
export function getProviderByIdDB(id) {
    const Query = db.prepare("SELECT * FROM providers WHERE id = ?");
    const Row = Query.get(id);
    if (!Row)
        return null;
    return mapProviderRow(Row);
}
export function upsertProviderDB(config) {
    const Query = db.prepare(`
        INSERT INTO providers (
            id, provider_id, name, category, protocol, base_url, api_key,
            access_token, refresh_token, account_id, organization_id,
            token_expires_at, last_refreshed_at, custom_headers,
            provider_specific_data, enabled, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            provider_id = excluded.provider_id,
            name = excluded.name,
            category = excluded.category,
            protocol = excluded.protocol,
            base_url = excluded.base_url,
            api_key = excluded.api_key,
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            account_id = excluded.account_id,
            organization_id = excluded.organization_id,
            token_expires_at = excluded.token_expires_at,
            last_refreshed_at = excluded.last_refreshed_at,
            custom_headers = excluded.custom_headers,
            provider_specific_data = excluded.provider_specific_data,
            enabled = excluded.enabled,
            created_at = excluded.created_at;
    `);
    Query.run(config.id, config.providerId, config.name, config.category, config.protocol, config.base_url ?? null, config.apiKey ?? null, config.accessToken ?? null, config.refreshToken ?? null, config.accountId ?? null, config.organizationId ?? null, config.tokenExpiresAt ?? null, config.lastRefreshedAt ?? null, config.customHeaders ? JSON.stringify(config.customHeaders) : null, config.providerSpecificData ? JSON.stringify(config.providerSpecificData) : null, config.enabled ? 1 : 0, config.createdAt);
    return config;
}
export function createProviderDB(config) {
    return upsertProviderDB(config);
}
export function deleteProviderDB(id) {
    const Query = db.prepare("DELETE FROM providers WHERE id = ?");
    const Result = Query.run(id);
    return num(Result.changes) > 0;
}
export function updateProviderTokensDB(input) {
    db.prepare(`UPDATE providers SET
            access_token = ?,
            refresh_token = ?,
            token_expires_at = ?,
            last_refreshed_at = ?
         WHERE id = ?`).run(input.accessToken, input.refreshToken ?? null, input.tokenExpiresAt ?? null, input.lastRefreshedAt ?? null, input.id);
}
export function getConnectionsByProviderIdDB(providerId) {
    const PId = providerId.toLowerCase();
    const Query = db.prepare("SELECT * FROM providers WHERE LOWER(provider_id) = ? OR LOWER(id) = ? ORDER BY created_at DESC");
    const Rows = Query.all(PId, PId);
    return Rows.map(mapProviderRow);
}
function mapProviderRow(row) {
    return {
        id: str(row.id),
        providerId: str(row.provider_id),
        name: str(row.name),
        category: optStr(row.category),
        protocol: optStr(row.protocol),
        base_url: optStr(row.base_url),
        apiKey: optStr(row.api_key),
        accessToken: optStr(row.access_token),
        refreshToken: optStr(row.refresh_token),
        accountId: optStr(row.account_id),
        organizationId: optStr(row.organization_id),
        tokenExpiresAt: row.token_expires_at ? num(row.token_expires_at) : undefined,
        lastRefreshedAt: row.last_refreshed_at ? num(row.last_refreshed_at) : undefined,
        customHeaders: row.custom_headers ? JSON.parse(str(row.custom_headers)) : undefined,
        providerSpecificData: row.provider_specific_data
            ? JSON.parse(str(row.provider_specific_data))
            : undefined,
        enabled: Boolean(row.enabled),
        createdAt: num(row.created_at)
    };
}
