import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { getRedis, closeRedis } from "../src/db/redis.js";

// DB-backed (serenity): order dipersistensi; test memakai Postgres riil + seed prod_001.
const pool = createPool();
const future = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
const createdOrders: string[] = [];

async function postOrder(body: unknown): Promise<Response> {
  const res = await createApp(pool).request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res;
}

after(async () => {
  for (const id of createdOrders) {
    await pool.query("DELETE FROM order_items WHERE order_id = $1", [id]);
    await pool.query("DELETE FROM orders WHERE id = $1", [id]);
  }
  await pool.end();
  await closeRedis();
});

// Flush rate-limit rl:* sebelum file ini (counter Redis dibagi lintas file; serial run).
before(async () => {
  const r = getRedis();
  if (r.status === "wait" || r.status === "close" || r.status === "end") await r.connect();
  const keys = await r.keys("rl:*");
  if (keys.length > 0) await r.del(...keys);
});

describe("orders", () => {
  it("POST /orders scheduled <24 jam → 400 INVALID_SCHEDULE", async () => {
    const res = await postOrder({ items: [{ product_id: "prod_001", quantity: 1 }], mode: "scheduled", scheduled_at: new Date(Date.now() + 3600 * 1000).toISOString() });
    assert.equal(res.status, 400);
  });
  it("POST /orders instant + scheduled_at → 400 INVALID_SCHEDULE", async () => {
    const res = await postOrder({ items: [{ product_id: "prod_001", quantity: 1 }], mode: "instant", scheduled_at: future });
    assert.equal(res.status, 400);
  });
  it("PUT /orders/:id/status tanpa internal key → 403", async () => {
    const res = await createApp(pool).request("/api/v1/orders/HP-0001/status", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "paid" }) });
    assert.equal(res.status, 403);
  });
  it("POST /orders qty 11 → 400 VALIDATION_ERROR", async () => {
    const res = await postOrder({ items: [{ product_id: "prod_001", quantity: 11 }], mode: "instant" });
    assert.equal(res.status, 400);
  });
});

describe("orders delivery", () => {
  const base = { items: [{ product_id: "prod_001", quantity: 1 }], mode: "instant" };

  it("delivery tanpa address → 400 INVALID_ADDRESS", async () => {
    const res = await postOrder({ ...base, delivery_method: "delivery" });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("delivery address <10 char → 400 INVALID_ADDRESS", async () => {
    const res = await postOrder({ ...base, delivery_method: "delivery", delivery_address: "jl a" });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("delivery address >500 char → 400 INVALID_ADDRESS", async () => {
    const res = await postOrder({ ...base, delivery_method: "delivery", delivery_address: "a".repeat(501) });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("pickup + address terisi → 400 INVALID_ADDRESS", async () => {
    const res = await postOrder({ ...base, delivery_method: "pickup", delivery_address: "Jl. Sehat No. 10 Jakarta" });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("delivery + address valid → 200 + echo field", async () => {
    const res = await postOrder({ ...base, delivery_method: "delivery", delivery_address: "Jl. Sehat No. 10 Jakarta" });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { data: { order_id: string; delivery_method: string; delivery_address: string } };
    createdOrders.push(json.data.order_id);
    assert.equal(json.data.delivery_method, "delivery");
    assert.equal(json.data.delivery_address, "Jl. Sehat No. 10 Jakarta");
  });
});
