import { OPENAI_BASE_URL } from "@srouter/constants";
import { isToolCallingNotSupportedError } from "@srouter/pricing";
import { parseDataLine, streamLines } from "./base.js";
import { fetchWithRetry } from "./retry.js";
function stripProviderPrefix(model) {
    const slash = model.indexOf("/");
    return slash >= 0 ? model.slice(slash + 1) : model;
}
/**
 * Strip tools and tool_choice from request body for models that don't support tool calling.
 */
function stripToolsFromRequest(req) {
    const stripped = { ...req };
    delete stripped.tools;
    delete stripped.tool_choice;
    return stripped;
}
/**
 * Parse the upstream max_tokens limit from a 400 error body.
 * Returns the capped value when the error mentions max_tokens, otherwise null.
 * Handles both valid JSON and malformed JSON with literal newlines in strings.
 */
function parseMaxTokensLimit(errorBody) {
    // Try strict JSON parse first
    try {
        const parsed = JSON.parse(errorBody);
        if (parsed?.error?.param === "max_tokens" && parsed.error.message) {
            const match = parsed.error.message.match(/(?:less than or equal to|max(?:imum)?(?:\s+value)?(?:\s+(?:for|is))?[:\s]+)\s*`?(\d+)`?/i);
            if (match)
                return Number(match[1]);
        }
    }
    catch {
        // malformed JSON — fall through to regex on raw text
    }
    // Fallback: regex directly on the raw error text for "param":"max_tokens" + limit number
    if (errorBody.includes('"param"') && errorBody.includes('"max_tokens"')) {
        const match = errorBody.match(/(?:less than or equal to|max(?:imum)?(?:\s+value)?(?:\s+(?:for|is))?[:\s]+)\s*`?(\d+)`?/i);
        if (match)
            return Number(match[1]);
    }
    return null;
}
export class OpenAIExecutor {
    id;
    name;
    baseUrl;
    apiKey;
    accessToken;
    constructor(options = {}) {
        this.id = options.id ?? "openai";
        this.name = options.name ?? "OpenAI Provider";
        this.baseUrl = (options.baseUrl ?? OPENAI_BASE_URL).replace(/\/$/, "");
        this.apiKey = options.apiKey ?? "";
        this.accessToken = options.accessToken ?? "";
    }
    /**
     * Update tokens after a refresh — called by TokenRefreshService.
     */
    updateToken(accessToken, refreshToken) {
        if (accessToken)
            this.accessToken = accessToken;
    }
    getHeaders(accept) {
        const headers = {
            "Content-Type": "application/json",
            "User-Agent": "SRouter/1.0.0 (Node.js)",
            "Accept-Encoding": "identity",
            Accept: accept ?? "application/json"
        };
        const token = this.accessToken || this.apiKey;
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
            if (token.startsWith("AIzaSy")) {
                headers["x-goog-api-key"] = token;
            }
            else if (token.startsWith("ya29.")) {
                headers["User-Agent"] = "Antigravity/1.0 (VSCode)";
                headers["x-goog-api-client"] = "gl-node/18.0.0 gd/1.0.0";
            }
        }
        return headers;
    }
    async listModels() {
        try {
            const res = await fetch(`${this.baseUrl}/models`, {
                method: "GET",
                headers: this.getHeaders()
            });
            if (!res.ok) {
                return [];
            }
            const data = (await res.json());
            if (!data.data || !Array.isArray(data.data)) {
                return [];
            }
            const baseId = this.id.split("_")[0]?.split("-")[0] ?? this.id;
            return data.data.map((m) => ({
                id: `${baseId}/${m.id}`,
                object: "model",
                owned_by: baseId
            }));
        }
        catch {
            return [];
        }
    }
    async chatCompletion(req) {
        const targetModel = stripProviderPrefix(req.model);
        const url = `${this.baseUrl}/chat/completions`;
        const hdrs = this.getHeaders();
        let res = await fetchWithRetry(url, { ...req, model: targetModel, stream: false }, hdrs);
        if (!res.ok) {
            const errorText = await res.text();
            // If tool calling is not supported, retry without tools
            if (isToolCallingNotSupportedError(errorText) && req.tools && req.tools.length > 0) {
                const strippedReq = stripToolsFromRequest({ ...req, model: targetModel, stream: false });
                res = await fetchWithRetry(url, strippedReq, hdrs, 1);
                if (!res.ok) {
                    const retryErrorText = await res.text();
                    throw new Error(`OpenAI Provider Error (${res.status}): ${retryErrorText}`);
                }
                return (await res.json());
            }
            const limit = parseMaxTokensLimit(errorText);
            if (limit !== null && req.max_tokens !== undefined && req.max_tokens > limit) {
                const clampedReq = { ...req, model: targetModel, stream: false, max_tokens: limit };
                res = await fetchWithRetry(url, clampedReq, hdrs, 1);
                if (!res.ok) {
                    const retryErrorText = await res.text();
                    throw new Error(`OpenAI Provider Error (${res.status}): ${retryErrorText}`);
                }
            }
            else {
                throw new Error(`OpenAI Provider Error (${res.status}): ${errorText}`);
            }
        }
        return (await res.json());
    }
    async *chatCompletionStream(req) {
        const targetModel = stripProviderPrefix(req.model);
        const url = `${this.baseUrl}/chat/completions`;
        const hdrs = this.getHeaders("text/event-stream, application/json, */*");
        let res = await fetchWithRetry(url, { ...req, model: targetModel, stream: true }, hdrs);
        if (!res.ok) {
            const errorText = await res.text();
            // If tool calling is not supported, retry without tools
            if (isToolCallingNotSupportedError(errorText) && req.tools && req.tools.length > 0) {
                const strippedReq = stripToolsFromRequest({ ...req, model: targetModel, stream: true });
                res = await fetchWithRetry(url, strippedReq, hdrs, 1);
                if (!res.ok) {
                    const retryErrorText = await res.text();
                    throw new Error(`OpenAI Provider Stream Error (${res.status}): ${retryErrorText}`);
                }
            }
            else {
                const limit = parseMaxTokensLimit(errorText);
                if (limit !== null && req.max_tokens !== undefined && req.max_tokens > limit) {
                    const clampedReq = { ...req, model: targetModel, stream: true, max_tokens: limit };
                    res = await fetchWithRetry(url, clampedReq, hdrs, 1);
                    if (!res.ok) {
                        const retryErrorText = await res.text();
                        throw new Error(`OpenAI Provider Stream Error (${res.status}): ${retryErrorText}`);
                    }
                }
                else {
                    throw new Error(`OpenAI Provider Stream Error (${res.status}): ${errorText}`);
                }
            }
        }
        if (!res.body) {
            throw new Error("No response body received for streaming");
        }
        for await (const line of streamLines(res.body)) {
            const jsonStr = parseDataLine(line);
            if (jsonStr === null)
                continue;
            try {
                const parsed = JSON.parse(jsonStr);
                yield parsed;
            }
            catch {
                // ignore malformed JSON chunk
            }
        }
    }
}
