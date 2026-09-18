import { db } from "./db.js";
import { num, str } from "./row-utils.js";
export class AdminAuthStore {
    database;
    constructor(database = db) {
        this.database = database;
        this.database.exec(`
            CREATE TABLE IF NOT EXISTS admin_account (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                password_hash TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS admin_sessions (
                token_hash TEXT PRIMARY KEY,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL
            );
        `);
    }
    hasAdminAccount() {
        const Row = this.database
            .prepare("SELECT 1 AS present FROM admin_account WHERE id = 1")
            .get();
        return Boolean(Row);
    }
    createAdminAccount(passwordHash, now = Date.now()) {
        const Result = this.database
            .prepare(`INSERT OR IGNORE INTO admin_account (id, password_hash, created_at, updated_at)
                 VALUES (1, ?, ?, ?)`)
            .run(passwordHash, now, now);
        return num(Result.changes) > 0;
    }
    getPasswordHash() {
        const Row = this.database
            .prepare("SELECT password_hash FROM admin_account WHERE id = 1")
            .get();
        return Row?.password_hash ? str(Row.password_hash) : null;
    }
    updatePasswordHash(passwordHash, now = Date.now()) {
        const Result = this.database
            .prepare(`UPDATE admin_account
                 SET password_hash = ?, updated_at = ?
                 WHERE id = 1`)
            .run(passwordHash, now);
        return num(Result.changes) > 0;
    }
    createSession(tokenHash, createdAt, expiresAt) {
        this.database
            .prepare(`INSERT INTO admin_sessions (token_hash, created_at, expires_at)
                 VALUES (?, ?, ?)`)
            .run(tokenHash, createdAt, expiresAt);
    }
    getSession(tokenHash, now = Date.now()) {
        this.database.prepare("DELETE FROM admin_sessions WHERE expires_at <= ?").run(now);
        const Row = this.database
            .prepare(`SELECT token_hash, created_at, expires_at
                 FROM admin_sessions
                 WHERE token_hash = ? AND expires_at > ?`)
            .get(tokenHash, now);
        if (!Row)
            return null;
        return {
            tokenHash: str(Row.token_hash),
            createdAt: num(Row.created_at),
            expiresAt: num(Row.expires_at)
        };
    }
    deleteSession(tokenHash) {
        const Result = this.database
            .prepare("DELETE FROM admin_sessions WHERE token_hash = ?")
            .run(tokenHash);
        return num(Result.changes) > 0;
    }
}
export const adminAuthStore = new AdminAuthStore();
