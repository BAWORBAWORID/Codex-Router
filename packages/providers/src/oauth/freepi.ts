import { FREEPI_AUTH_BASE_URL } from "@codex/constants";

export interface FreePiDeviceFlowResponse {
    sessionId: string;
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
    interval: number;
    expiresIn?: number;
}

export interface FreePiPollResult {
    status: "pending" | "ok" | "error";
    token?: string;
    error?: string;
    retryAfter?: number;
}

const CONSENT_VERSION = "4";

async function postJson(url: string, body: unknown): Promise<Response> {
    return fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
    });
}

export class FreePiOAuth {
    private authBaseUrl: string;

    constructor(authBaseUrl: string = FREEPI_AUTH_BASE_URL) {
        this.authBaseUrl = authBaseUrl.replace(/\/$/, "");
    }

    async initiateDeviceFlow(): Promise<FreePiDeviceFlowResponse> {
        const res = await postJson(`${this.authBaseUrl}/auth/github/device`, {});
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`FreePi device flow start failed (${res.status}): ${text}`);
        }
        const data = (await res.json()) as {
            session_id?: string;
            user_code?: string;
            verification_uri?: string;
            verification_uri_complete?: string;
            interval?: number;
            expires_in?: number;
        };
        if (!data.session_id || !data.user_code || !data.verification_uri) {
            throw new Error("FreePi device flow start returned incomplete response");
        }
        return {
            sessionId: data.session_id,
            userCode: data.user_code,
            verificationUri: data.verification_uri,
            verificationUriComplete: data.verification_uri_complete,
            interval: typeof data.interval === "number" ? data.interval : 5,
            expiresIn: data.expires_in
        };
    }

    async submitConsent(sessionId: string): Promise<void> {
        const res = await postJson(`${this.authBaseUrl}/auth/consent`, {
            session_id: sessionId,
            consent_version: CONSENT_VERSION
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`FreePi consent submission failed (${res.status}): ${text}`);
        }
    }

    async pollToken(sessionId: string): Promise<FreePiPollResult> {
        try {
            const res = await postJson(`${this.authBaseUrl}/auth/token`, { session_id: sessionId });
            if (res.status === 403) {
                const body = (await res.json().catch(() => undefined)) as { code?: string } | undefined;
                if (body?.code === "consent_required") {
                    return { status: "error", error: "consent_required" };
                }
            }
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                return { status: "pending", error: `HTTP ${res.status}: ${text}` };
            }
            const parsed = (await res.json()) as
                | { token: string }
                | { status: "pending"; retry_after?: number }
                | { code: "consent_required"; message?: string };
            if ("token" in parsed && parsed.token) {
                return { status: "ok", token: parsed.token };
            }
            if ("code" in parsed && parsed.code === "consent_required") {
                return { status: "error", error: "consent_required" };
            }
            const retryAfter =
                "retry_after" in parsed && typeof parsed.retry_after === "number"
                    ? parsed.retry_after
                    : undefined;
            return { status: "pending", retryAfter };
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            return { status: "pending", error: msg };
        }
    }

    async getMe(token: string): Promise<{ id?: string; email?: string; handle?: string }> {
        try {
            const res = await fetch(`${this.authBaseUrl}/me`, {
                headers: { authorization: `Bearer ${token}` }
            });
            if (!res.ok) return {};
            const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
            return {
                id: typeof body.user_id === "string" ? body.user_id : undefined,
                email: typeof body.email === "string" ? body.email : undefined,
                handle: typeof body.handle === "string" ? body.handle : undefined
            };
        } catch {
            return {};
        }
    }
}
