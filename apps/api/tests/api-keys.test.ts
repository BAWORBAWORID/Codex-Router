import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
    createAPIKeyDB,
    deleteAPIKeyDB,
    getAllAPIKeysDB,
    getAPIKeyByKeyDB,
    incrementAPIKeyUsageDB,
    updateAPIKeyDB
} from "@codex/db";

const createdIds: string[] = [];

afterEach(() => {
    for (const id of createdIds.splice(0)) {
        deleteAPIKeyDB(id);
    }
});

test("createAPIKeyDB stores a new virtual key with prefix sr-live-", () => {
    const created = createAPIKeyDB({
        name: "Test Client Key",
        rateLimit: 60,
        quotaLimit: 50000
    });

    createdIds.push(created.id);

    assert.ok(created.id.startsWith("key_"));
    assert.ok(created.key.startsWith("sr-live-"));
    assert.equal(created.name, "Test Client Key");
    assert.equal(created.enabled, true);
    assert.equal(created.rate_limit, 60);
    assert.equal(created.quota_limit, 50000);
    assert.equal(created.usage_tokens, 0);

    const lookup = getAPIKeyByKeyDB(created.key);
    assert.ok(lookup);
    assert.equal(lookup?.id, created.id);
    assert.equal(lookup?.name, "Test Client Key");
});

test("incrementAPIKeyUsageDB and deleteAPIKeyDB work accurately", () => {
    const created = createAPIKeyDB({
        name: "Usage Test Key"
    });

    createdIds.push(created.id);

    incrementAPIKeyUsageDB(created.id, 1250);

    const all = getAllAPIKeysDB();
    const found = all.find((k) => k.id === created.id);
    assert.equal(found?.usage_tokens, 1250);

    const deleted = deleteAPIKeyDB(created.id);
    assert.equal(deleted, true);

    const lookupAfterDelete = getAPIKeyByKeyDB(created.key);
    assert.equal(lookupAfterDelete, null);
});

test("createAPIKeyDB supports enabled false on creation", () => {
    const created = createAPIKeyDB({
        name: "Disabled Key",
        enabled: false
    });

    createdIds.push(created.id);

    assert.equal(created.enabled, false);
    const lookup = getAPIKeyByKeyDB(created.key);
    // getAPIKeyByKeyDB only returns enabled keys
    assert.equal(lookup, null);
    const all = getAllAPIKeysDB();
    const found = all.find((k) => k.id === created.id);
    assert.equal(found?.enabled, false);
});

test("updateAPIKeyDB updates name, limits, and resets them to 0 (Unlimited)", () => {
    const created = createAPIKeyDB({
        name: "Initial Key",
        rateLimit: 60,
        quotaLimit: 10000000,
        creditLimit: 50
    });

    createdIds.push(created.id);

    assert.equal(created.rate_limit, 60);
    assert.equal(created.quota_limit, 10000000);
    assert.equal(created.credit_limit, 50);

    // Update with new values
    const updated = updateAPIKeyDB(created.id, {
        name: "Renamed Key",
        quota_limit: 20000000,
        rate_limit: 120,
        credit_limit: 100
    });

    assert.ok(updated);
    assert.equal(updated?.name, "Renamed Key");
    assert.equal(updated?.quota_limit, 20000000);
    assert.equal(updated?.rate_limit, 120);
    assert.equal(updated?.credit_limit, 100);

    // Reset to 0 (Unlimited)
    const reset = updateAPIKeyDB(created.id, {
        quota_limit: 0,
        rate_limit: 0,
        credit_limit: 0
    });

    assert.ok(reset);
    assert.equal(reset?.quota_limit, 0);
    assert.equal(reset?.rate_limit, 0);
    assert.equal(reset?.credit_limit, 0);

    // Support null as 0 (Unlimited)
    const nullReset = updateAPIKeyDB(created.id, {
        quota_limit: null,
        rate_limit: null,
        credit_limit: null
    });

    assert.ok(nullReset);
    assert.equal(nullReset?.quota_limit, 0);
    assert.equal(nullReset?.rate_limit, 0);
    assert.equal(nullReset?.credit_limit, 0);
});

