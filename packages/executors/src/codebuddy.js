import { CODEBUDDY_BASE_URL, CODEBUDDY_MODELS } from "@srouter/constants";
import { accumulateChunks } from "@srouter/translator";
import { parseDataLine, streamLines } from "./base.js";
function stripProviderPrefix(model) {
    const slash = model.indexOf("/");
    return slash >= 0 ? model.slice(slash + 1) : model;
}
export class CodeBuddyExecutor {
    id;
    name;
    baseUrl;
    apiKey;
    accessToken;
    modelPrefix;
    domain;
    userAgent;
    flavor;
    constructor(options = {}) {
        this.id = options.id ?? "codebuddy";
        this.name = options.name ?? "CodeBuddy Provider";
        this.baseUrl = (options.baseUrl ?? CODEBUDDY_BASE_URL).replace(/\/$/, "");
        this.apiKey = options.apiKey ?? "";
        this.accessToken = options.accessToken ?? "";
        this.modelPrefix = options.modelPrefix ?? this.id.split("_")[0]?.split("-")[0] ?? this.id;
        this.domain = options.domain;
        this.userAgent = options.userAgent ?? "IDE/2.108.1 CodeBuddy/2.108.1";
        this.flavor = options.flavor ?? "ide";
    }
    updateToken(accessToken) {
        if (accessToken)
            this.accessToken = accessToken;
    }
    getHeaders() {
        const headers = {
            "Content-Type": "application/json",
            "User-Agent": this.userAgent
        };
        const ideName = this.flavor === "cli" ? "CLI" : "IDE";
        headers["X-Product"] = "SaaS";
        headers["X-IDE-Type"] = ideName;
        headers["X-IDE-Name"] = ideName;
        headers["x-requested-with"] = "XMLHttpRequest";
        headers["x-codebuddy-request"] = "1";
        if (this.domain)
            headers["X-Domain"] = this.domain;
        const token = this.accessToken || this.apiKey;
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        return headers;
    }
    getChatUrl() {
        if (this.baseUrl.endsWith("/chat/completions")) {
            return this.baseUrl;
        }
        if (this.baseUrl.endsWith("/v2")) {
            return `${this.baseUrl}/chat/completions`;
        }
        return `${this.baseUrl}/v2/chat/completions`;
    }
    transformRequestBody(req) {
        const targetModel = stripProviderPrefix(req.model);
        const transformed = {
            ...req,
            model: targetModel,
            stream: true // CodeBuddy requires stream: true
        };
        // Handle reasoning effort
        const eff = req.reasoning_effort;
        if (eff === "none" || eff === "off") {
            delete transformed.reasoning_effort;
        }
        else if (eff) {
            transformed.reasoning_summary = "auto";
        }
        // CodeBuddy requires a leading system prompt and typed blocks for user content
        const source = Array.isArray(req.messages) ? req.messages : [];
        const messages = [{ role: "system", content: "You are CodeBuddy Code." }];
        for (const message of source) {
            if (!message ||
                typeof message !== "object" ||
                ["system", "developer"].includes(message.role ?? "")) {
                continue;
            }
            if (message.role === "user" &&
                typeof message.content === "string") {
                messages.push({
                    ...message,
                    content: [{ type: "text", text: message.content }]
                });
            }
            else {
                messages.push({ ...message });
            }
        }
        transformed.messages = messages;
        return transformed;
    }
    async listModels() {
        return CODEBUDDY_MODELS.map((m) => ({
            id: `${this.modelPrefix}/${m.id}`,
            object: "model",
            owned_by: this.modelPrefix
        }));
    }
    async chatCompletion(req) {
        // CodeBuddy upstream is stream-only (forceStream). Run the stream and
        // accumulate the final response for non-streaming callers.
        const chunks = [];
        for await (const chunk of this.chatCompletionStream(req)) {
            chunks.push(chunk);
        }
        return accumulateChunks(chunks, req.model);
    }
    async *chatCompletionStream(req) {
        const body = this.transformRequestBody(req);
        const res = await fetch(this.getChatUrl(), {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`CodeBuddy Provider Error (${res.status}): ${errorText}`);
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
                // ignore malformed chunk
            }
        }
    }
}
