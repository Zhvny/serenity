import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstile, turnstileFailopenTotal } from "../src/services/turnstile.js";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.TURNSTILE_SECRET;
});

function stubFetch(impl: (url: string, init?: RequestInit) => Promise<Response>): void {
  process.env.TURNSTILE_SECRET = "test-secret";
  globalThis.fetch = (async (url: unknown, init?: unknown) => impl(url as string, init as RequestInit)) as typeof fetch;
}

function siteverify(success: boolean, errorCodes: string[] = []): Response {
  return new Response(JSON.stringify({ success, "error-codes": errorCodes }), { status: 200, headers: { "content-type": "application/json" } });
}

describe("verifyTurnstile", () => {
  it("success:true -> ok", async () => {
    stubFetch(async () => siteverify(true));
    assert.deepEqual(await verifyTurnstile("tok-valid"), { ok: true });
  });
  it("success:false -> tolak", async () => {
    stubFetch(async () => siteverify(false));
    assert.deepEqual(await verifyTurnstile("tok-palsu"), { ok: false });
  });
  it("token dipakai-ulang (timeout-or-duplicate) -> tolak, bukan fail-open", async () => {
    stubFetch(async () => siteverify(false, ["timeout-or-duplicate"]));
    assert.deepEqual(await verifyTurnstile("tok-bekas"), { ok: false });
  });
  it("fetch throw -> fail-open + counter naik", async () => {
    stubFetch(async () => { throw new Error("down"); });
    const before = turnstileFailopenTotal();
    assert.deepEqual(await verifyTurnstile("tok"), { ok: "failopen" });
    assert.equal(turnstileFailopenTotal(), before + 1);
  });
  it("siteverify non-2xx -> fail-open", async () => {
    stubFetch(async () => new Response("err", { status: 500 }));
    assert.deepEqual(await verifyTurnstile("tok"), { ok: "failopen" });
  });
  it("TURNSTILE_STRICT=true: network error -> tolak (fail-closed darurat)", async () => {
    process.env.TURNSTILE_STRICT = "true";
    stubFetch(async () => { throw new Error("down"); });
    try {
      assert.deepEqual(await verifyTurnstile("tok"), { ok: false });
    } finally {
      delete process.env.TURNSTILE_STRICT;
    }
  });
  it("secret unset -> tolak tanpa panggil fetch", async () => {
    delete process.env.TURNSTILE_SECRET;
    let called = false;
    globalThis.fetch = (async () => { called = true; throw new Error("must-not-call"); }) as typeof fetch;
    assert.deepEqual(await verifyTurnstile("tok"), { ok: false });
    assert.equal(called, false);
  });
  it("token kosong -> tolak", async () => {
    stubFetch(async () => siteverify(true));
    assert.deepEqual(await verifyTurnstile(""), { ok: false });
  });
});
