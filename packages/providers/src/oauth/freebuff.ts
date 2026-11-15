import crypto from "node:crypto";
import { FREEBUFF_WEBSITE_URL } from "@codex/constants";
import type { OAuthTokenResponse } from "./base.js";

export interface FreebuffDeviceCodeResponse {
    loginUrl: string;
    fingerprintHash: string;
    expiresAt: string;
    fingerprintId: string;
}

export interface FreebuffPollResponse {
    success: boolean;
    pending?: boolean;
    tokens?: OAuthTokenResponse;
    user?: {
        id?: string;
        email?: string;
        name?: string;
    };
    error?: string;
}

export class FreebuffOAuth {
    private websiteUrl: string;

    constructor(websiteUrl: string = FREEBUFF_WEBSITE_URL) {
        this.websiteUrl = websiteUrl.replace(/\/$/, "");
    }

    /**
     * Request a device login URL from /api/auth/cli/code
     */
    async initiateLogin(customFingerprintId?: string): Promise<FreebuffDeviceCodeResponse> {
        const fingerprintId = customFingerprintId || crypto.randomUUID();
        const res = await fetch(`${this.websiteUrl}/api/auth/cli/code`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "ai-sdk/openai-compatible/0.0.36/codebuff"
            },
            body: JSON.stringify({ fingerprintId })
        });

        if (!res.ok) {
            const err = await res.text().catch(() => "");
            throw new Error(`Failed to request Freebuff login code (${res.status}): ${err}`);
        }

        const data = (await res.json()) as { loginUrl?: string; fingerprintHash?: string; expiresAt?: string };
        if (!data.loginUrl || !data.fingerprintHash || !data.expiresAt) {
            throw new Error("Invalid response from Freebuff login code endpoint");
        }

        return {
            loginUrl: data.loginUrl,
            fingerprintHash: data.fingerprintHash,
            expiresAt: data.expiresAt,
            fingerprintId
        };
    }

    /**
     * Poll login status from /api/auth/cli/status
     */
    async pollStatus(params: {
        fingerprintId: string;
        fingerprintHash: string;
        expiresAt: string;
    }): Promise<FreebuffPollResponse> {
        const query = new URLSearchParams({
            fingerprintId: params.fingerprintId,
            fingerprintHash: params.fingerprintHash,
            expiresAt: params.expiresAt
        });

        const res = await fetch(`${this.websiteUrl}/api/auth/cli/status?${query.toString()}`, {
            method: "GET",
            headers: {
                "User-Agent": "ai-sdk/openai-compatible/0.0.36/codebuff"
            }
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 404) {
                return { success: false, pending: true };
            }
            const err = await res.text().catch(() => "");
            return { success: false, pending: false, error: `Freebuff status error (${res.status}): ${err}` };
        }

        const data = (await res.json()) as { user?: { id?: string; email?: string; name?: string; authToken?: string } };
        if (data.user && typeof data.user === "object" && data.user.authToken) {
            const authToken = data.user.authToken;
            const accountId = data.user.email || data.user.id || "freebuff_user";
            return {
                success: true,
                pending: false,
                tokens: {
                    accessToken: authToken,
                    refreshToken: authToken,
                    tokenType: "Bearer",
                    accountId
                },
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.name
                }
            };
        }

        return { success: false, pending: true };
    }

    /**
     * Validate an auth token / PAT and fetch user info from /api/v1/me
     */
    async fetchUserInfo(authToken: string): Promise<{ id: string; email?: string; name?: string }> {
        const query = new URLSearchParams({ fields: "id,email,name" });
        const res = await fetch(`${this.websiteUrl}/api/v1/me?${query.toString()}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${authToken}`,
                "User-Agent": "ai-sdk/openai-compatible/0.0.36/codebuff"
            }
        });

        if (!res.ok) {
            const err = await res.text().catch(() => "");
            throw new Error(`Failed to validate Freebuff token (${res.status}): ${err}`);
        }

        const data = (await res.json()) as { id?: string; email?: string; name?: string };
        return {
            id: data.id || "freebuff_user",
            email: data.email,
            name: data.name
        };
    }
}
