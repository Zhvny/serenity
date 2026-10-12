import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { closeRedis } from "../src/db/redis.js";
import { claimIdem, completeIdem, idemKeyOf } from "../src/services/idempotency.js";

process.env.QUASI_STATIC_QR_URL = "https://qr.example/merchant";
process.env.TURNSTILE_SECRET = "test-secret";

// Stub siteverify Cloudflare (sama pola qris.test.ts).
const realFetch = globalThis.fetch;
globalThis.fetch = (async () => new Response(JSON.stringify({ success: true }), { status: 200 })) as typeof fetch;

const pool = createPool();
const XFF = `idem-ip-${randomUUID()}`;
const createdOrders: string[] = [];
const createdCarts: string[] = [];
const createdKeys: Array<[string, string]> = [];

after(async () => {
  // Anak topup dulu (FK parent_code), baru induk (order_items ikut CASCADE).
  await pool.query("DELETE FROM orders WHERE parent_code IS NOT NULL AND parent_code IN (SELECT unique_code FROM orders WHERE id = ANY($1))", [createdOrders]);
  for (const id of createdOrders) {
    await pool.query("DELETE FROM order_items WHERE order_id = $1", [id]);
    await pool.query("DELETE FROM orders WHERE id = $1", [id]);
  }
  for (const id of createdCarts) {
    await pool.query("DELETE FROM cart_items WHERE cart_id = $1", [id]);
    await pool.query("DELETE FROM carts WHERE id = $1", [id]);
  }
  for (const [ep, k] of createdKeys) {
    await pool.query("DELETE FROM idempotency_keys WHERE endpoint = $1 AND key = $2", [ep, k]);
  }
  globalThis.fetch = realFetch; await pool.end();
  await closeRedis();
});

async function seedCart(): Promise<string> {
  const cartId = `idem-cart-${randomUUID()}`;
  createdCarts.push(cartId);
  await pool.query("INSERT INTO carts (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [cartId]);
  await pool.query("INSERT INTO cart_items (item_id, cart_id, product_id, quantity, note) VALUES ($1, $2, 'samp_001', 1, NULL)", [randomUUID(), cartId]);
  return cartId;
}

describe("idempotency-key", () => {
  it("idemKeyOf: tolak kosong/kepanjangan/CRLF", () => {
    assert.equal(idemKeyOf(undefined), null);
    assert.equal(idemKeyOf("  "), null);
    assert.equal(idemKeyOf("a".repeat(65)), null);
    assert.equal(idemKeyOf("a\r\nb"), null);
    assert.equal(idemKeyOf(" k-1 "), "k-1");
  });

  it("service: fresh -> busy -> complete -> replay; basi di-reclaim", async () => {
    const ep = "TEST /svc", k = `k-${randomUUID()}`;
    createdKeys.push([ep, k]);
    assert.deepEqual(await claimIdem(pool, ep, k), { kind: "fresh" });
    assert.deepEqual(await claimIdem(pool, ep, k), { kind: "busy" });
    await completeIdem(pool, ep, k, { ok: 1 });
    const rep = await claimIdem(pool, ep, k);
    assert.equal(rep.kind, "replay");
    await pool.query("UPDATE idempotency_keys SET created_at = CURRENT_TIMESTAMP - INTERVAL '25 hours' WHERE endpoint = $1 AND key = $2", [ep, k]);
    assert.deepEqual(await claimIdem(pool, ep, k), { kind: "fresh" });
  });

  it("generate-code: key sama -> unique_code sama, 1 order (cart kedua kosong pun replay)", async () => {
    const cartId = await seedCart();
    const key = `gen-${randomUUID()}`;
    createdKeys.push(["POST /orders/generate-code", key]);
    const hdr = { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF, "Idempotency-Key": key };
    const r1 = await createApp(pool).request("/api/v1/orders/generate-code", { method: "POST", headers: hdr, body: JSON.stringify({ turnstile_token: "tok" }) });
    assert.equal(r1.status, 200);
    const d1 = ((await r1.json()) as { data: { order_id: string; unique_code: string } }).data;
    createdOrders.push(d1.order_id);
    // Cart sudah dikosongkan; tanpa replay ini 429/400 — replay harus 200 identik.
    const r2 = await createApp(pool).request("/api/v1/orders/generate-code", { method: "POST", headers: hdr, body: JSON.stringify({ turnstile_token: "tok" }) });
    assert.equal(r2.status, 200);
    const d2 = ((await r2.json()) as { data: { order_id: string; unique_code: string } }).data;
    assert.equal(d2.unique_code, d1.unique_code);
    const n = (await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM orders WHERE unique_code = $1", [d1.unique_code])).rows[0]?.n;
    assert.equal(n, 1);
  });

  it("POST /orders: key sama -> order_id sama, tanpa ganda", async () => {
    const key = `ord-${randomUUID()}`;
    createdKeys.push(["POST /orders", key]);
    const hdr = { "content-type": "application/json", "x-forwarded-for": XFF, "Idempotency-Key": key };
    const body = JSON.stringify({ items: [{ product_id: "samp_001", quantity: 1 }], mode: "instant" });
    const r1 = await createApp(pool).request("/api/v1/orders", { method: "POST", headers: hdr, body });
    assert.equal(r1.status, 200);
    const d1 = ((await r1.json()) as { data: { order_id: string } }).data;
    createdOrders.push(d1.order_id);
    const r2 = await createApp(pool).request("/api/v1/orders", { method: "POST", headers: hdr, body });
    assert.equal(r2.status, 200);
    assert.equal(((await r2.json()) as { data: { order_id: string } }).data.order_id, d1.order_id);
  });

  it("topup: key sama -> child sama, 1 anak", async () => {
    const cartId = await seedCart();
    const gk = `par-${randomUUID()}`;
    createdKeys.push(["POST /orders/generate-code", gk]);
    const gen = await createApp(pool).request("/api/v1/orders/generate-code", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF, "Idempotency-Key": gk },
      body: JSON.stringify({ turnstile_token: "tok" }),
    });
    const par = ((await gen.json()) as { data: { order_id: string; unique_code: string; nominal: number } }).data;
    createdOrders.push(par.order_id);
    await pool.query("UPDATE orders SET status = 'underpaid', paid_amount = $2 WHERE id = $1", [par.order_id, par.nominal - 10000]);
    const tk = `top-${randomUUID()}`;
    createdKeys.push([`POST /orders/${par.unique_code}/topup`, tk]);
    const hdr = { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF, "Idempotency-Key": tk };
    const t1 = await createApp(pool).request(`/api/v1/orders/${par.unique_code}/topup`, { method: "POST", headers: hdr });
    assert.equal(t1.status, 200);
    const c1 = ((await t1.json()) as { data: { order_id: string; unique_code: string } }).data;
    createdOrders.push(c1.order_id);
    // Retry: anak terbuka ada, tapi replay mendahului cek bisnis -> 200 identik.
    const t2 = await createApp(pool).request(`/api/v1/orders/${par.unique_code}/topup`, { method: "POST", headers: hdr });
    assert.equal(t2.status, 200);
    assert.equal(((await t2.json()) as { data: { unique_code: string } }).data.unique_code, c1.unique_code);
    const n = (await pool.query<{ n: number }>("SELECT count(*)::int AS n FROM orders WHERE parent_code = $1", [par.unique_code])).rows[0]?.n;
    assert.equal(n, 1);
  });
});
