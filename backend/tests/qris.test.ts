import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { closeRedis } from "../src/db/redis.js";

process.env.QUASI_STATIC_QR_URL = "https://qr.example/merchant";

const pool = createPool();
const XFF = `qris-ip-${randomUUID()}`;
const createdOrders: string[] = [];
const createdCarts: string[] = [];

after(async () => {
  for (const id of createdOrders) {
    await pool.query("DELETE FROM order_items WHERE order_id = $1", [id]);
    await pool.query("DELETE FROM orders WHERE id = $1", [id]);
  }
  for (const id of createdCarts) {
    await pool.query("DELETE FROM cart_items WHERE cart_id = $1", [id]);
    await pool.query("DELETE FROM carts WHERE id = $1", [id]);
  }
  await pool.end();
  await closeRedis();
});

async function seedCart(): Promise<string> {
  const cartId = `qris-cart-${randomUUID()}`;
  createdCarts.push(cartId);
  await pool.query("INSERT INTO carts (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [cartId]);
  await pool.query("INSERT INTO cart_items (item_id, cart_id, product_id, quantity, note) VALUES ($1, $2, 'samp_001', 2, NULL)", [randomUUID(), cartId]);
  return cartId;
}

describe("qris generate-code + thanks (ADR-0001)", () => {
  it("generate-code: hitung total server dari cart, balik unique_code + qr_url + nominal", async () => {
    const cartId = await seedCart();
    const res = await createApp(pool).request("/api/v1/orders/generate-code", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);
    const { data } = (await res.json()) as { data: { unique_code: string; qr_url: string; nominal: number; order_id: string } };
    createdOrders.push(data.order_id);
    assert.match(data.unique_code, /^ORD-[0-9A-F]{12,}$/);
    assert.equal(data.qr_url.includes("qr.example"), true);
    assert.equal(data.nominal, 90000); // samp_001 45000 x 2
    // Detail pesanan: cart item tersalin ke order_items.
    const n = (await pool.query<{ n: string }>("SELECT count(*)::int AS n FROM order_items WHERE order_id = $1", [data.order_id])).rows[0]?.n;
    assert.equal(Number(n), 1);
    const qty = (await pool.query<{ quantity: number }>("SELECT quantity FROM order_items WHERE order_id = $1", [data.order_id])).rows[0]?.quantity;
    assert.equal(qty, 2);
  });

  it("generate-code: donation_consent true tersimpan", async () => {
    const cartId = await seedCart();
    const res = await createApp(pool).request("/api/v1/orders/generate-code", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF },
      body: JSON.stringify({ donation_consent: true }),
    });
    assert.equal(res.status, 200);
    const { data } = (await res.json()) as { data: { unique_code: string; order_id: string } };
    createdOrders.push(data.order_id);
    const row = await pool.query<{ donation_consent: boolean }>("SELECT donation_consent FROM orders WHERE id = $1", [data.order_id]);
    assert.equal(row.rows[0]?.donation_consent, true);
  });

  it("thanks: sertakan paid_amount + donation_consent", async () => {
    const cartId = await seedCart();
    const gen = await createApp(pool).request("/api/v1/orders/generate-code", { method: "POST", headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF }, body: "{}" });
    const { data } = (await gen.json()) as { data: { unique_code: string; order_id: string } };
    createdOrders.push(data.order_id);
    await pool.query("UPDATE orders SET paid_amount = 50000, donation_consent = TRUE WHERE id = $1", [data.order_id]);
    const owner = await createApp(pool).request(`/api/v1/thanks?ref=${data.unique_code}`, { headers: { cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF } });
    assert.equal(owner.status, 200);
    const body = (await owner.json()) as { data: Record<string, unknown> };
    assert.equal(body.data["paid_amount"], 50000);
    assert.equal(body.data["donation_consent"], true);
  });

  it("generate-code: keranjang dikosongkan setelah order dibuat", async () => {
    const cartId = await seedCart();
    const gen = await createApp(pool).request("/api/v1/orders/generate-code", { method: "POST", headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF }, body: "{}" });
    assert.equal(gen.status, 200);
    const { data } = (await gen.json()) as { data: { order_id: string } };
    createdOrders.push(data.order_id);
    const cart = await pool.query("SELECT count(*)::int AS n FROM cart_items WHERE cart_id = $1", [cartId]);
    assert.equal(Number(cart.rows[0]?.n), 0);
  });

  it("thanks: pemilik sesi -> 200 (kode+nominal+qr), sesi lain -> 404 seragam", async () => {
    const cartId = await seedCart();
    const gen = await createApp(pool).request("/api/v1/orders/generate-code", { method: "POST", headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF }, body: "{}" });
    const { data } = (await gen.json()) as { data: { unique_code: string; order_id: string } };
    createdOrders.push(data.order_id);

    const owner = await createApp(pool).request(`/api/v1/thanks?ref=${data.unique_code}`, { headers: { cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF } });
    assert.equal(owner.status, 200);
    const body = (await owner.json()) as { data: { unique_code: string; nominal: number; qr_url: string } };
    assert.equal(body.data.unique_code, data.unique_code);
    assert.equal(body.data.nominal, 90000);
    assert.equal(typeof body.data.qr_url, "string");
    // tanpa alamat/nama lengkap
    assert.equal((body.data as Record<string, unknown>)["delivery_address"], undefined);

    const other = await createApp(pool).request(`/api/v1/thanks?ref=${data.unique_code}`, { headers: { cookie: "cart_id=penyusup-lain", "x-forwarded-for": XFF } });
    assert.equal(other.status, 404);
  });

  it("thanks: ref tak ada -> 404", async () => {
    const res = await createApp(pool).request("/api/v1/thanks?ref=ORD-TIDAKADA", { headers: { cookie: "cart_id=x", "x-forwarded-for": XFF } });
    assert.equal(res.status, 404);
  });
});
