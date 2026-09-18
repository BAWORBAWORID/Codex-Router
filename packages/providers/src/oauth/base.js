import crypto from "node:crypto";
/**
 * Generates PKCE code_verifier and S256 code_challenge
 */
export function generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const state = crypto.randomBytes(16).toString("base64url");
    const hash = crypto.createHash("sha256").update(codeVerifier).digest();
    const codeChallenge = hash.toString("base64url");
    return {
        codeVerifier,
        codeChallenge,
        state
    };
}
