import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { closeRedis } from "../src/db/redis.js";
import { markPaid, listMine, expireStale } from "../src/services/orders.js";

// DB-backed (serenity): order dipersistensi; test memakai Postgres riil + seed prod_001.
const pool = createPool();
const XFF = `orders-ip-${randomUUID()}`; // IP unik -> bucket rate-limit terisolasi dari file lain
const future = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
const createdOrders: string[] = [];

async function postOrder(body: unknown): Promise<Response> {
  const res = await createApp(pool).request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": XFF }, body: JSON.stringify(body) });
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
    const res = await createApp(pool).request("/api/v1/orders/HP-0001/status", { method: "PUT", headers: { "content-type": "application/json", "x-forwarded-for": XFF }, body: JSON.stringify({ status: "paid" }) });
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

describe("orders underpaid service", () => {
  const sess = `sess-${randomUUID()}`;
  async function seedOrder(total: number, status = "pending_payment"): Promise<{ id: string; code: string }> {
    const id = `T-${randomUUID().slice(0, 8)}`;
    const code = `ORD-${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 16)}`;
    await pool.query(
      "INSERT INTO orders (id, mode, total_amount, status, delivery_method, session_id, unique_code) VALUES ($1, 'instant', $2, $3, 'pickup', $4, $5)",
      [id, total, status, sess, code],
    );
    createdOrders.push(id);
    return { id, code };
  }

  it("markPaid kurang -> underpaid + paid_amount tercatat", async () => {
    const { code } = await seedOrder(50000);
    const o = await markPaid(pool, code, 30000);
    assert.equal(o?.status, "underpaid");
    assert.equal(o?.paid_amount, 30000);
  });
  it("markPaid pas -> paid", async () => {
    const { code } = await seedOrder(50000);
    const o = await markPaid(pool, code, 50000);
    assert.equal(o?.status, "paid");
    assert.equal(o?.paid_amount, 50000);
  });
  it("markPaid lebih -> paid", async () => {
    const { code } = await seedOrder(50000);
    const o = await markPaid(pool, code, 60000);
    assert.equal(o?.status, "paid");
    assert.equal(o?.paid_amount, 60000);
  });
  it("markPaid non-pending -> null", async () => {
    const { code } = await seedOrder(50000, "paid");
    assert.equal(await markPaid(pool, code, 50000), null);
  });
  it("listMine hanya milik sesi", async () => {
    await seedOrder(10000);
    const mine = await listMine(pool, sess);
    assert.ok(mine.length >= 1);
    const other = await listMine(pool, `sess-lain-${randomUUID()}`);
    assert.equal(other.length, 0);
  });
  it("expireStale: basi -> expired, fresh -> tetap", async () => {
    const old = await seedOrder(10000);
    await pool.query("UPDATE orders SET updated_at = CURRENT_TIMESTAMP - INTERVAL '3 hours' WHERE id = $1", [old.id]);
    const fresh = await seedOrder(10000);
    const n = await expireStale(pool, 2);
    assert.ok(n >= 1);
    const o = await pool.query<{ status: string }>("SELECT status FROM orders WHERE id = $1", [old.id]);
    assert.equal(o.rows[0]?.status, "expired");
    const f = await pool.query<{ status: string }>("SELECT status FROM orders WHERE id = $1", [fresh.id]);
    assert.equal(f.rows[0]?.status, "pending_payment");
  });
});
