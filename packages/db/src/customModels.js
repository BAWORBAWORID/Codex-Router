import { db } from "./db.js";
import { num, str } from "./row-utils.js";
export function getAllCustomModelsDB() {
    const Rows = db
        .prepare("SELECT * FROM custom_models ORDER BY created_at ASC")
        .all();
    return Rows.map(mapCustomModelRow);
}
export function getCustomModelsByProviderDB(providerId) {
    const Rows = db
        .prepare("SELECT * FROM custom_models WHERE provider_id = ? ORDER BY created_at ASC")
        .all(providerId);
    return Rows.map(mapCustomModelRow);
}
export function addCustomModelDB(providerId, modelId) {
    const CreatedAt = Date.now();
    db.prepare(`INSERT OR IGNORE INTO custom_models (provider_id, model_id, created_at)
         VALUES (?, ?, ?)`).run(providerId, modelId, CreatedAt);
    return { providerId, modelId, createdAt: CreatedAt };
}
export function deleteCustomModelDB(providerId, modelId) {
    const Result = db
        .prepare("DELETE FROM custom_models WHERE provider_id = ? AND model_id = ?")
        .run(providerId, modelId);
    return num(Result.changes) > 0;
}
function mapCustomModelRow(row) {
    return {
        providerId: str(row.provider_id),
        modelId: str(row.model_id),
        createdAt: num(row.created_at)
    };
}
