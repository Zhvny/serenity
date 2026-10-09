import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { tieredRateLimit, memRateCount } from "../src/middleware/security.js";

function app() {
  const a = new Hono();
  a.use(tieredRateLimit());
  a.get("/x", (c) => c.json({ ok: true }));
  a.post("/x", (c) => c.json({ ok: true }));
  return a;
}

describe("tieredRateLimit fallback memori (F2)", () => {
  it("memRateCount: hitung naik dalam window", async () => {
    const k = `t-${Date.now()}-a`;
    assert.equal(memRateCount(k), 1);
    assert.equal(memRateCount(k), 2);
    assert.equal(memRateCount(`t-${Date.now()}-b`), 1);
  });
  it("RATE_LIMIT_STORE=memory: POST ke-21 -> 429", async () => {
    const prev = process.env.RATE_LIMIT_STORE;
    process.env.RATE_LIMIT_STORE = "memory";
    try {
      const a = app();
      const ip = `mem-${Date.now()}`;
      let last = 0;
      for (let i = 0; i < 21; i += 1) {
        const r = await a.request("/x", { method: "POST", headers: { "x-forwarded-for": ip } });
        last = r.status;
      }
      assert.equal(last, 429);
      const body = (await (await a.request("/x", { method: "POST", headers: { "x-forwarded-for": ip } })).json()) as { code: string };
      assert.equal(body.code, "RATE_LIMITED");
    } finally {
      if (prev === undefined) delete process.env.RATE_LIMIT_STORE; else process.env.RATE_LIMIT_STORE = prev;
    }
  });
});
