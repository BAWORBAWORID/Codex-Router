import { z } from "zod";
import type { ProviderConfig } from "../provider.js";

export const AuthPollStatus = {
    PENDING: "pending",
    OK: "ok"
} as const;

export type AuthPollStatus = (typeof AuthPollStatus)[keyof typeof AuthPollStatus];

export const StatePayloadSchema = z.object({
    state: z.string().min(1)
});

export type StatePayload = z.infer<typeof StatePayloadSchema>;

export const OAuthCallbackBodySchema = z.object({
    code: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    callback_url: z.string().url().optional()
});

export type OAuthCallbackBody = z.infer<typeof OAuthCallbackBodySchema>;

export const TokenImportBodySchema = z
    .preprocess((val) => {
        if (val && typeof val === "object") {
            const v = val as Record<string, unknown>;
            const token =
                typeof v.access_token === "string" && v.access_token.length > 0
                    ? v.access_token
                    : typeof v.accessToken === "string" && v.accessToken.length > 0
                      ? v.accessToken
                      : typeof v.token === "string" && v.token.length > 0
                        ? v.token
                        : v.access_token;
            const refresh =
                typeof v.refresh_token === "string"
                    ? v.refresh_token
                    : typeof v.refreshToken === "string"
                      ? v.refreshToken
                      : v.refresh_token;
            return { ...v, access_token: token, refresh_token: refresh };
        }
        return val;
    }, z
    .object({
        access_token: z
            .string({ required_error: "Field 'access_token' is required" })
            .min(1, "Field 'access_token' is required"),
        refresh_token: z.string().optional(),
        base_url: z.string().url().optional(),
        name: z.string().optional()
    })
    .passthrough());

export type TokenImportBody = z.infer<typeof TokenImportBodySchema>;

export interface AuthPollResult {
    status: AuthPollStatus;
    provider?: ProviderConfig;
    error?: string;
}
