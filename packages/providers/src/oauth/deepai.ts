import nodeCrypto from "node:crypto";
import type { OAuthTokenResponse, PKCEPair } from "./base.js";

export class DeepAIOAuth {
    getAuthorizationUrl(pkce: PKCEPair): string {
        // DeepAI desktop auth requires a 64-character hex string as state (32 bytes random)
        const state = pkce.state.length === 64 ? pkce.state : nodeCrypto.randomBytes(32).toString("hex");
        pkce.state = state;
        const port = 1455;
        return `https://api.deepai.org/deepai_code/desktop_auth/?state=${state}&port=${port}`;
    }

    async exchangeCodeForTokens(code: string, _codeVerifier: string): Promise<OAuthTokenResponse> {
        const res = await fetch("https://api.deepai.org/deepai_code/desktop_auth/exchange/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code })
        });

        if (!res.ok) {
            const err = await res.text().catch(() => "");
            throw new Error(`DeepAI Auth Exchange Failed (${res.status}): ${err}`);
        }

        const data = (await res.json()) as { api_key?: string; username?: string; is_pro?: boolean };
        if (!data.api_key) {
            throw new Error("DeepAI did not return an API key");
        }

        return {
            accessToken: data.api_key,
            refreshToken: data.api_key,
            tokenType: "Bearer",
            accountId: data.username || "deepai_user"
        };
    }
}
