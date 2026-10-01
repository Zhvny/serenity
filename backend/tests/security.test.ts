import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { getRedis, closeRedis } from "../src/db/redis.js";
import type { Pool } from "pg";

const pool = { query: async () => ({ rows: [] }) } as unknown as Pool;

describe("security", () => {
  const ip = `sec-test-${Date.now()}`;
  after(async () => {
    try {
      const r = getRedis();
      const keys = await r.keys(`rl:*:${ip}`);
      if (keys.length > 0) await r.del(...keys);
    } catch { /* abaikan */ }
    await closeRedis();
  });

  it("route hilang → 404 {status:error,code:NOT_FOUND}", async () => {
    const res = await createApp(pool).request("/api/v1/tidak-ada");
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { status: "error", code: "NOT_FOUND", message: "Tidak ditemukan" });
  });

  it("rate-limit tiered: POST > 20/menit → ada 429", async () => {
    const app = createApp(pool);
    let limited = false;
    for (let i = 0; i < 22; i++) {
      const r = await app.request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify({ items: [], mode: "instant" }) });
      if (r.status === 429) { limited = true; break; }
    }
    assert.equal(limited, true);
  });
});
