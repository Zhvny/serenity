import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, scryptSync } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { closeRedis } from "../src/db/redis.js";

// E2E in-process: satu instance createApp (meniru server nyata) melintasi banyak
// endpoint. Menangkap kelas bug "semua endpoint 500" (mis. salah DATABASE_URL) yang
// test per-unit bisa lewatkan.

process.env.QUASI_STATIC_QR_URL = process.env.QUASI_STATIC_QR_URL ?? "https://qr.e2e/merchant";
const SALT = "e2esalt123456789";
const PASS = "e2e-pass-123";

const pool = createPool();
const app = createApp(pool);
const XFF = `e2e-ip-${randomUUID()}`;
const createdOrders: string[] = [];
const createdCarts: string[] = [];

before(() => {
  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASS_HASH = `${SALT}:${scryptSync(PASS, SALT, 64).toString("hex")}`;
});

after(async () => {
  for (const id of createdOrders) {
    await pool.query("DELETE FROM order_items WHERE order_id = $1", [id]);
    await pool.query("DELETE FROM audit_logs WHERE detail::text LIKE $1", [`%${id}%`]);
    await pool.query("DELETE FROM orders WHERE id = $1", [id]);
  }
  for (const id of createdCarts) {
    await pool.query("DELETE FROM cart_items WHERE cart_id = $1", [id]);
    await pool.query("DELETE FROM carts WHERE id = $1", [id]);
  }
  await pool.query("DELETE FROM admin_sessions WHERE username = $1", ["admin"]);
  await pool.end();
  await closeRedis();
});

const base = { "x-forwarded-for": XFF };
const csrf = { "content-type": "application/json", origin: "http://localhost:5173", "x-csrf-token": "e2e", cookie: "csrf_token=e2e", ...base };

function json(headers: Record<string, string> = {}): Record<string, string> {
  return { "content-type": "application/json", ...base, ...headers };
}

describe("E2E alur publik (health -> menu -> cart) semua 200, bukan 500", () => {
  it("health 200", async () => {
    const r = await app.request("/api/v1/health", { headers: base });
    assert.equal(r.status, 200);
    assert.equal(((await r.json()) as { data: { ok: boolean } }).data.ok, true);
  });

  it("categories 200 + ada data seed", async () => {
    const r = await app.request("/api/v1/categories", { headers: base });
    assert.equal(r.status, 200);
    const { data } = (await r.json()) as { data: unknown[] };
    assert.ok(Array.isArray(data) && data.length >= 1, "categories kosong/500");
  });

  it("products 200 + ada data seed", async () => {
    const r = await app.request("/api/v1/products", { headers: base });
    assert.equal(r.status, 200);
    const { data } = (await r.json()) as { data: Array<{ id: string }> };
    assert.ok(Array.isArray(data) && data.length >= 1, "products kosong/500");
    assert.ok(data.some((p) => p.id === "prod_001"), "seed prod_001 tak ada");
  });

  it("cart kosong (tanpa cookie) 200 -> []", async () => {
    const r = await app.request("/api/v1/cart", { headers: base });
    assert.equal(r.status, 200);
    assert.deepEqual(((await r.json()) as { data: unknown[] }).data, []);
  });
});

describe("E2E alur pesan -> bayar QRIS -> admin mark-paid", () => {
  it("cart/add issue cookie; generate-code; thanks owner; admin lunasi; thanks jadi paid", async () => {
    // 1) Tambah ke cart (tanpa cookie -> server set cart_id)
    const add = await app.request("/api/v1/cart/add", { method: "POST", headers: json(), body: JSON.stringify({ product_id: "prod_001", quantity: 2 }) });
    assert.equal(add.status, 200);
    const setCookie = add.headers.get("set-cookie") ?? "";
    const cartId = setCookie.match(/cart_id=([^;]+)/)?.[1];
    assert.ok(cartId !== undefined, "cart_id cookie tak di-set");
    createdCarts.push(cartId);
    const cookie = `cart_id=${cartId}`;

    // 2) GET cart -> 1 item qty 2
    const cart = await app.request("/api/v1/cart", { headers: { cookie, ...base } });
    assert.equal(cart.status, 200);
    const items = ((await cart.json()) as { data: Array<{ product_id: string; quantity: number }> }).data;
    assert.equal(items.length, 1);
    assert.equal(items[0]?.quantity, 2);

    // 3) generate-code QRIS: nominal server = 45000 x 2
    const gen = await app.request("/api/v1/orders/generate-code", { method: "POST", headers: json({ cookie }), body: "{}" });
    assert.equal(gen.status, 200);
    const g = ((await gen.json()) as { data: { order_id: string; unique_code: string; qr_url: string; nominal: number } }).data;
    createdOrders.push(g.order_id);
    assert.match(g.unique_code, /^ORD-[0-9A-F]+$/);
    assert.equal(g.nominal, 90000);
    assert.ok(g.qr_url.includes(g.unique_code), "qr_url harus memuat ref unique_code");

    // 4) thanks pemilik -> 200 pending, tanpa PII
    const th1 = await app.request(`/api/v1/thanks?ref=${g.unique_code}`, { headers: { cookie, ...base } });
    assert.equal(th1.status, 200);
    const t1 = ((await th1.json()) as { data: { status: string; nominal: number } & Record<string, unknown> }).data;
    assert.equal(t1.status, "pending_payment");
    assert.equal(t1.nominal, 90000);
    assert.equal(t1["delivery_address"], undefined, "PII bocor di thanks");

    // 5) thanks sesi lain -> 404 seragam
    const thOther = await app.request(`/api/v1/thanks?ref=${g.unique_code}`, { headers: { cookie: "cart_id=penyusup", ...base } });
    assert.equal(thOther.status, 404);

    // 6) admin login -> session
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf, body: JSON.stringify({ username: "admin", password: PASS }) });
    assert.equal(login.status, 200);
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    assert.notEqual(sid, "");

    // 7) admin mark-paid (nominal penuh dari mutasi) -> changed true
    const markHeaders = { ...csrf, cookie: `admin_session=${sid}; csrf_token=e2e` };
    const mp = await app.request(`/api/v1/admin/orders/${g.unique_code}/mark-paid`, { method: "POST", headers: markHeaders, body: JSON.stringify({ paid_amount: 90000 }) });
    assert.equal(mp.status, 200);
    assert.equal(((await mp.json()) as { data: { changed: boolean } }).data.changed, true);

    // 8) thanks pemilik sekarang -> paid
    const th2 = await app.request(`/api/v1/thanks?ref=${g.unique_code}`, { headers: { cookie, ...base } });
    assert.equal(th2.status, 200);
    assert.equal(((await th2.json()) as { data: { status: string } }).data.status, "paid");
  });
});

describe("E2E security headers hadir di respons", () => {
  it("CSP + HSTS + nosniff + X-Frame + Referrer", async () => {
    const r = await app.request("/api/v1/health", { headers: base });
    assert.ok(r.headers.get("content-security-policy"));
    assert.ok(r.headers.get("strict-transport-security"));
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.equal(r.headers.get("x-frame-options"), "DENY");
    assert.ok(r.headers.get("referrer-policy"));
  });
});
