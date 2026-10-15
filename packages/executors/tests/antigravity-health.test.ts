import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ANTIGRAVITY_MODELS } from "@codex/constants";
import type { AntigravityExecutor } from "../src/antigravity.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = originalFetch;
});

/**
 * The health cache is module scoped on purpose, so every test needs a fresh
 * copy of the module. A cache-busting query gives ESM a new instance without
 * exporting a reset hook purely for tests.
 */
async function freshExecutor(): Promise<AntigravityExecutor> {
    const mod = await import(`../src/antigravity.js?health=${Math.random()}`);
    return new mod.AntigravityExecutor({ accessToken: "ya29.test_token" });
}

function stubFetch(responder: (body: string) => Response) {
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        return responder(String(init?.body ?? ""));
    }) as typeof globalThis.fetch;
}

const healthy = () => Response.json({ candidates: [{ content: { parts: [{ text: "pong" }] } }] });
const envelopeModel = (body: string) => JSON.parse(body).model as string;

test("model health check hides models the upstream no longer serves", async () => {
    const retired = new Set(["gemini-3.6-flash-high", "gemini-3.6-flash-low"]);
    stubFetch((body) =>
        retired.has(envelopeModel(body))
            ? new Response(JSON.stringify({ error: { code: 404, message: "Requested entity was not found." } }), { status: 404 })
            : healthy()
    );

    const ids = (await (await freshExecutor()).listModels()).map((m) => m.id);

    assert.equal(ids.length, ANTIGRAVITY_MODELS.length - retired.size);
    for (const id of retired) assert.equal(ids.includes(id), false, `${id} should be hidden`);
});

test("model health check hides models that answer with a retirement notice", async () => {
    stubFetch((body) =>
        // gemini-3.5-flash-high maps to the internal id gemini-3-flash-agent
        envelopeModel(body) === "gemini-3-flash-agent"
            ? Response.json({ candidates: [{ content: { parts: [{ text: "Gemini 3.5 Flash is no longer available. Please switch to Gemini 3.7 Flash." }] } }] })
            : healthy()
    );

    const ids = (await (await freshExecutor()).listModels()).map((m) => m.id);

    assert.equal(ids.includes("gemini-3.5-flash-high"), false);
    assert.equal(ids.includes("gemini-3.5-flash-medium"), true);
});

test("model health check keeps models that are only rate limited", async () => {
    stubFetch(() => new Response(JSON.stringify({ error: { code: 429, message: "Resource has been exhausted" } }), { status: 429 }));

    const ids = (await (await freshExecutor()).listModels()).map((m) => m.id);

    assert.deepEqual(ids, ANTIGRAVITY_MODELS.map((m) => m.id));
});

test("model health check keeps the full catalog when upstream is unreachable", async () => {
    stubFetch(() => {
        throw new Error("network down");
    });

    const ids = (await (await freshExecutor()).listModels()).map((m) => m.id);

    assert.deepEqual(ids, ANTIGRAVITY_MODELS.map((m) => m.id));
});

test("one health check serves every Antigravity connection", async () => {
    let probes = 0;
    stubFetch(() => {
        probes++;
        return healthy();
    });

    const mod = await import(`../src/antigravity.js?shared=${Math.random()}`);
    const a = new mod.AntigravityExecutor({ accessToken: "ya29.test_token", id: "antigravity_a" });
    const b = new mod.AntigravityExecutor({ accessToken: "ya29.test_token", id: "antigravity_b" });

    await a.listModels();
    await b.listModels();

    assert.equal(probes, ANTIGRAVITY_MODELS.length);
});

test("model health result is cached across listModels calls", async () => {
    let probes = 0;
    stubFetch(() => {
        probes++;
        return healthy();
    });

    const executor = await freshExecutor();
    await executor.listModels();
    const after = probes;
    await executor.listModels();

    assert.equal(probes, after, "second call must reuse the cached health result");
});