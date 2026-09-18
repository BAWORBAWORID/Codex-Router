import { db } from "./db.js";
import { num, str } from "./row-utils.js";
export function saveOAuthSessionDB(session) {
    db.prepare(`INSERT INTO oauth_sessions (state, code_verifier, client_id, redirect_uri, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(state) DO UPDATE SET
             code_verifier = excluded.code_verifier,
             client_id = excluded.client_id,
             redirect_uri = excluded.redirect_uri,
             created_at = excluded.created_at;`).run(session.state, session.codeVerifier ?? "", session.clientId ?? "", session.redirectUri ?? "", session.createdAt ?? Date.now());
    return session;
}
export function getOAuthSessionDB(state) {
    const Row = db.prepare("SELECT * FROM oauth_sessions WHERE state = ?").get(state);
    if (!Row)
        return null;
    return {
        state: str(Row.state),
        codeVerifier: str(Row.code_verifier),
        clientId: str(Row.client_id),
        redirectUri: str(Row.redirect_uri),
        createdAt: num(Row.created_at)
    };
}
export function deleteOAuthSessionDB(state) {
    const Result = db.prepare("DELETE FROM oauth_sessions WHERE state = ?").run(state);
    return num(Result.changes) > 0;
}
export function cleanupExpiredOAuthSessionsDB(maxAgeMs) {
    const Cutoff = Date.now() - maxAgeMs;
    db.prepare("DELETE FROM oauth_sessions WHERE created_at < ?").run(Cutoff);
}
