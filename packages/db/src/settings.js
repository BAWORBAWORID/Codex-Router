import { db } from "./db.js";
import { str } from "./row-utils.js";
export function getSettingDB(key, defaultValue = "") {
    const Stmt = db.prepare("SELECT value FROM system_settings WHERE key = ?");
    const Row = Stmt.get(key);
    return Row ? Row.value : defaultValue;
}
export function setSettingDB(key, value) {
    const Stmt = db.prepare(`
        INSERT INTO system_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    Stmt.run(key, value);
}
export function getAllSettingsDB() {
    const Stmt = db.prepare("SELECT key, value FROM system_settings");
    const Rows = Stmt.all();
    const Result = {};
    for (const r of Rows) {
        Result[r.key] = r.value;
    }
    return Result;
}
export function getRequireApiKeyDB() {
    const Val = getSettingDB("require_api_key", "false");
    return Val === "true" || Val === "1";
}
export function setRequireApiKeyDB(required) {
    setSettingDB("require_api_key", required ? "true" : "false");
}
