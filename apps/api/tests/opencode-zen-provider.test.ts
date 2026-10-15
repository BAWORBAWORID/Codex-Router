import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { GLOBAL_VERSION, OPENCODE_ZEN_MODELS, OPENCODE_ZEN_PROVIDER, providerById } from "@codex/constants";
import { OpenAIExecutor, OpenCodeZenExecutor } from "@srouter/executors";
import * as executors from "@srouter/executors";

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

describe("OpenCode Zen provider metadata", () => {
    it("is registered as a known provider", () => {
        assert.equal(providerById("opencode_zen")?.name, "OpenCode Zen");
        assert.equal(OPENCODE_ZEN_PROVIDER.base_url, "https://opencode.ai/zen/v1");
        assert.equal(OPENCODE_ZEN_PROVIDER.category, "free_tier");
        assert.equal(OPENCODE_ZEN_PROVIDER.protocol, "openai");
    });

    it("treats the API key as optional because community models answer keyless", () => {
        assert.equal(OPENCODE_ZEN_PROVIDER.requires_api_key, false);
        assert.match(OPENCODE_ZEN_PROVIDER.status_message, /paid models need an OpenCode Zen API key/);
    });

    it("keeps the fallback catalog free of retired model ids", () => {
        assert.equal(OPENCODE_ZEN_MODELS.some((m) => m.id === "laguna-s-2.1-free"), false);
        assert.equal(OPENCODE_ZEN_MODELS.some((m) => m.id === "big-pickle"), false);
        assert.equal(OPENCODE_ZEN_MODELS.some((m) => m.id === "space-bunny-free"), true);
    });

    it("does not re-export the catalog from the executors package", () => {
        assert.equal("OPENCODE_ZEN_MODELS" in executors, false);
    });
});

describe("OpenCode Zen model discovery", () => {
    it("reads the live catalog from /zen/v1/models under the zen/ prefix", async () => {
        let requestUrl = "";
        globalThis.fetch = async (input) => {
            requestUrl = String(input);
            return Response.json({
                object: "list",
                data: [
                    { id: "big-pickle", object: "model" },
                    { id: "claude-sonnet-5", object: "model" }
                ]
            });
        };

        const models = await new OpenCodeZenExecutor().listModels();

        assert.equal(requestUrl, "https://opencode.ai/zen/v1/models");
        assert.deepEqual(
            models.map((m) => m.id),
            ["zen/big-pickle", "zen/claude-sonnet-5"]
        );
        assert.deepEqual(
            models.map((m) => m.owned_by),
            ["zen", "zen"]
        );
    });

    it("keeps the alias prefix for custom connection ids", async () => {
        globalThis.fetch = async () => Response.json({ object: "list", data: [{ id: "gpt-5.5" }] });

        const models = await new OpenCodeZenExecutor({ id: "opencode_zen_1700000000" }).listModels();

        assert.deepEqual(
            models.map((m) => m.id),
            ["zen/gpt-5.5"]
        );
    });

    it("falls back to the bundled catalog when the endpoint returns nothing", async () => {
        globalThis.fetch = async () => Response.json({ object: "list", data: [] });

        const models = await new OpenCodeZenExecutor().listModels();

        assert.equal(models.length, OPENCODE_ZEN_MODELS.length);
        assert.equal(models[0]?.id, `zen/${OPENCODE_ZEN_MODELS[0]?.id}`);
    });

    it("falls back to the bundled catalog when the endpoint is unreachable", async () => {
        globalThis.fetch = async () => {
            throw new Error("network down");
        };

        const models = await new OpenCodeZenExecutor().listModels();

        assert.equal(models.length, OPENCODE_ZEN_MODELS.length);
    });

    it("identifies the gateway and tags each request with a correlation id", async () => {
        const seen: Array<Record<string, string>> = [];
        globalThis.fetch = async (_input, init) => {
            seen.push(Object.fromEntries(new Headers(init?.headers).entries()));
            return Response.json({ object: "list", data: [] });
        };

        const executor = new OpenCodeZenExecutor();
        await executor.listModels();
        await executor.listModels();

        assert.equal(seen.length, 2);
        assert.equal(seen[0]?.["x-opencode-client"], `srouter/${GLOBAL_VERSION}`);
        assert.match(seen[0]?.["x-opencode-request"] ?? "", /^[0-9a-f-]{36}$/);
        assert.notEqual(seen[0]?.["x-opencode-request"], seen[1]?.["x-opencode-request"]);
        assert.match(seen[0]?.["x-real-ip"] ?? "", /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
        assert.notEqual(seen[0]?.["x-real-ip"], seen[1]?.["x-real-ip"]);
    });

    it("keeps the zen headers off other OpenAI-compatible providers", async () => {
        const seen: Array<Record<string, string>> = [];
        globalThis.fetch = async (_input, init) => {
            seen.push(Object.fromEntries(new Headers(init?.headers).entries()));
            return Response.json({ data: [] });
        };

        await new OpenAIExecutor({ id: "groq", baseUrl: "https://api.groq.com/openai/v1" }).listModels();

        assert.equal(seen[0]?.["x-opencode-client"], undefined);
        assert.equal(seen[0]?.["x-opencode-request"], undefined);
        assert.equal(seen[0]?.["x-real-ip"], undefined);
    });
});
