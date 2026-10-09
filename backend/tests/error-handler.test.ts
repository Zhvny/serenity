import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createApp, safeLogPath } from "../src/app.js";
import { getRedis, closeRedis } from "../src/db/redis.js";
import type { Pool } from "pg";

const okPool = { query: async () => ({ rows: [] }) } as unknown as Pool;

describe("error handler", () => {
  it("GET route tak dikenal -> 404 NOT_FOUND seragam", async () => {
    const res = await createApp(okPool).request("/api/v1/nope");
    assert.equal(res.status, 404);
    const b = (await res.json()) as { status: string; code: string; message: string };
    assert.equal(b.status, "error");
    assert.equal(b.code, "NOT_FOUND");
  });

  it("500 tidak bocorkan detail DB ke body maupun log", async () => {
    const leakPool = { query: async () => { throw new Error("relation passwords leaked password=xyz"); } } as unknown as Pool;
    const logs: string[] = [];
    const orig = console.error;
    console.error = (...args: unknown[]) => { logs.push(args.map(String).join(" ")); };
    try {
      const res = await createApp(leakPool).request("/api/v1/products");
      const txt = await res.text();
      assert.equal(res.status, 500);
      assert.doesNotMatch(txt, /passwords|leaked|password=xyz/);
      assert.doesNotMatch(logs.join("\n"), /passwords|leaked|password=xyz/);
    } finally {
      console.error = orig;
    }
  });

  it("log onError bebas CRLF/ANSI dari path (anti log-injection)", async () => {
    assert.equal(safeLogPath("/api/v1/x\r\nINJECTED\x1b[31m"), "/api/v1/xINJECTED[31m");
    assert.equal(safeLogPath("/ok").length > 0, true);
    assert.equal(safeLogPath("a".repeat(500)).length, 200);
    const boomPool = { query: async () => { throw new Error("boom"); } } as unknown as Pool;
    const logs: string[] = [];
    const orig = console.error;
    console.error = (...args: unknown[]) => { logs.push(args.map(String).join(" ")); };
    try {
      const res = await createApp(boomPool).request("/api/v1/products");
      assert.equal(res.status, 500);
      for (const line of logs) {
        assert.doesNotMatch(line, /[\r\n\x1b]/);
      }
    } finally {
      console.error = orig;
    }
  });
});

describe("tiered rate limit (Redis)", () => {
  const ip = `rl-test-${Date.now()}`;
  after(async () => {
    try {
      const r = getRedis();
      const keys = await r.keys(`rl:*:${ip}`);
      if (keys.length > 0) await r.del(...keys);
    } catch { /* abaikan */ }
    await closeRedis();
  });
  it("GET > 60/menit -> 429", async () => {
    const app = createApp(okPool);
    let limited = false;
    for (let i = 0; i < 62; i++) {
      const res = await app.request("/api/v1/health", { headers: { "x-forwarded-for": ip } });
      if (res.status === 429) {
        const b = (await res.json()) as { code: string };
        assert.equal(b.code, "RATE_LIMITED");
        limited = true;
        break;
      }
    }
    assert.equal(limited, true);
  });
});
