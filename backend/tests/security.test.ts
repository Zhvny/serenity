import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import type { Pool } from "pg";

const pool = { query: async () => ({ rows: [] }) } as unknown as Pool;

describe("security", () => {
  it("route hilang → 404 {status:error,code:NOT_FOUND}", async () => {
    const res = await createApp(pool).request("/api/v1/tidak-ada");
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { status: "error", code: "NOT_FOUND", message: "Tidak ditemukan" });
  });
  it("rate-limit payment: 61 request cepat → ada 429", async () => {
    const app = createApp(pool);
    let limited = false;
    for (let i = 0; i < 61; i++) {
      const r = await app.request("/api/v1/payment/create", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "security-test-8" }, body: JSON.stringify({ order_id: "x" }) });
      if (r.status === 429) { limited = true; break; }
    }
    assert.equal(limited, true);
  });
});
