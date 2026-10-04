import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { closeRedis } from "../src/db/redis.js";
import type { Pool } from "pg";

after(async () => { await closeRedis(); });

const pool = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pool;

describe("recommend", () => {
  it("PUT /preferences need=aneh → 400 INVALID_NEED", async () => {
    const res = await createApp(pool).request("/api/v1/preferences", {
      method: "PUT", headers: { "content-type": "application/json", "x-forwarded-for": "rec-bad" }, body: JSON.stringify({ need: "aneh" }),
    });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_NEED");
  });
  it("PUT /preferences diet → 200 + set-cookie cart_id bila absen", async () => {
    const res = await createApp(pool).request("/api/v1/preferences", {
      method: "PUT", headers: { "content-type": "application/json", "x-forwarded-for": "rec-new" }, body: JSON.stringify({ need: "diet" }),
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("set-cookie") ?? "", /cart_id=/);
  });
  it("GET /products/recommendations → 200 + array", async () => {
    const res = await createApp(pool).request("/api/v1/products/recommendations");
    assert.equal(res.status, 200);
    const body = await res.json() as { status: string; data: unknown[] };
    assert.ok(Array.isArray(body.data));
  });
});
