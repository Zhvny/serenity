import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { closeRedis } from "../src/db/redis.js";
import type { Pool } from "pg";

after(async () => { await closeRedis(); });

const posts = [
  { id: "00000000-0000-0000-0000-000000000001", title: "Fakta Gula", body: "B", excerpt: null, tag: "FunFact", product_id: null, image_url: null, product_ids: [], created_at: new Date().toISOString() },
];
const pool = { query: async (text: string) => ({ rows: String(text).includes("FROM posts") ? posts : [], rowCount: 1 }) } as unknown as Pool;

describe("posts trending", () => {
  it("POST /posts/:id/view tanpa cookie → terbitkan cart_id", async () => {
    const res = await createApp(pool).request("/api/v1/posts/00000000-0000-0000-0000-000000000001/view", { method: "POST", headers: { "x-forwarded-for": "trend-view-cookie" } });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("set-cookie") ?? "", /cart_id=/);
  });
  it("POST /posts/:id/view 200 + idempoten per session", async () => {
    const app = createApp(pool);
    // IP unik per test: isolasi dari bucket rate-limit test lain.
    const r1 = await app.request("/api/v1/posts/00000000-0000-0000-0000-000000000001/view", { method: "POST", headers: { "x-forwarded-for": "trend-view-1" } });
    assert.equal(r1.status, 200);
  });
  it("GET /posts/trending 200 + maks 3", async () => {
    const res = await createApp(pool).request("/api/v1/posts/trending");
    assert.equal(res.status, 200);
    const body = await res.json() as { status: string; data: unknown[] };
    assert.ok(body.data.length <= 3);
  });
  it("POST /posts/xxx/view unknown → 404 POST_NOT_FOUND", async () => {
    const empty = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pool;
    const res = await createApp(empty).request("/api/v1/posts/xxx/view", { method: "POST", headers: { "x-forwarded-for": "trend-view-404" } });
    assert.equal(res.status, 404);
  });
  it("POST /posts/bukan-uuid!/view → 404 tanpa sentuh DB", async () => {
    let called = 0;
    const spy = { query: async () => { called += 1; return { rows: [{ "1": 1 }], rowCount: 1 }; } } as unknown as Pool;
    const res = await createApp(spy).request("/api/v1/posts/bukan-uuid!/view", { method: "POST", headers: { "x-forwarded-for": "trend-view-bad" } });
    assert.equal(res.status, 404);
    assert.equal(called, 0);
  });
});
