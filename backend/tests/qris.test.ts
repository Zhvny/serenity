import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { closeRedis } from "../src/db/redis.js";

process.env.QUASI_STATIC_QR_URL = "https://qr.example/merchant";
process.env.TURNSTILE_SECRET = "test-secret";

// Stub siteverify Cloudflare (fetch global; app.request in-process tak pakai fetch).
let siteverifyImpl: () => Response = () =>
  new Response(JSON.stringify({ success: true, "error-codes": [] }), { status: 200 });
const realFetch = globalThis.fetch;
globalThis.fetch = (async () => siteverifyImpl()) as typeof fetch;

const TOK = "tok-test";
const genBody = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ turnstile_token: TOK, ...extra });

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
  globalThis.fetch = realFetch; await pool.end();
  await closeRedis();
});

async function seedCart(): Promise<string> {
  const cartId = `qris-cart-${randomUUID()}`;
  createdCarts.push(cartId);
  await pool.query("INSERT INTO carts (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [cartId]);
  await pool.query("INSERT INTO cart_items (item_id, cart_id, product_id, quantity, note) VALUES ($1, $2, 'prod_pb_bar', 2, NULL)", [randomUUID(), cartId]);
  return cartId;
}

describe("qris generate-code + thanks (ADR-0001)", () => {
  it("pilihan /cart/checkout (terjadwal + diantar) ikut tersimpan ke order", async () => {
    const cartId = await seedCart();
    const ip = `qris-ip-${randomUUID()}`;
    const when = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
    const co = await createApp(pool).request("/api/v1/cart/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": ip },
      body: JSON.stringify({ mode: "scheduled", scheduled_at: when, delivery_method: "delivery", delivery_address: "Jl. Kebon Jeruk No. 9, dekat masjid", delivery_lat: -6.2, delivery_lng: 106.8 }),
    });
    assert.equal(co.status, 200);
    const res = await createApp(pool).request("/api/v1/orders/generate-code", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": ip },
      body: genBody(),
    });
    assert.equal(res.status, 200);
    const { data } = (await res.json()) as { data: { order_id: string } };
    createdOrders.push(data.order_id);
    const { rows } = await pool.query("SELECT mode, scheduled_at, delivery_method, delivery_address, delivery_lat::float AS lat, delivery_lng::float AS lng FROM orders WHERE id = $1", [data.order_id]);
    assert.equal(rows[0].mode, "scheduled");
    assert.equal(new Date(rows[0].scheduled_at).toISOString(), when);
    assert.equal(rows[0].delivery_method, "delivery");
    assert.equal(rows[0].delivery_address, "Jl. Kebon Jeruk No. 9, dekat masjid");
    assert.equal(rows[0].lat, -6.2);
    assert.equal(rows[0].lng, 106.8);
    // Pilihan dibersihkan setelah order terbentuk (PII tidak tersisa di keranjang).
    const left = await pool.query("SELECT checkout_choice FROM carts WHERE id = $1", [cartId]);
    assert.equal(left.rows[0].checkout_choice, null);
  });

  it("nama & nomor WA dari /cart/checkout tersimpan ke order (nomor dinormalisasi)", async () => {
    const cartId = await seedCart();
    const ip = `qris-ip-${randomUUID()}`;
    const co = await createApp(pool).request("/api/v1/cart/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": ip },
      body: JSON.stringify({ mode: "instant", delivery_method: "pickup", customer_name: "  Budi  Santoso ", customer_phone: "0812-3456-7890" }),
    });
    assert.equal(co.status, 200);
    const res = await createApp(pool).request("/api/v1/orders/generate-code", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": ip },
      body: genBody(),
    });
    assert.equal(res.status, 200);
    const { data } = (await res.json()) as { data: { order_id: string } };
    createdOrders.push(data.order_id);
    const { rows } = await pool.query("SELECT customer_name, customer_phone FROM orders WHERE id = $1", [data.order_id]);
    assert.equal(rows[0].customer_name, "Budi Santoso");
    assert.equal(rows[0].customer_phone, "6281234567890");
  });

  it("thanks mengembalikan order_id (sumber nomor antrian harian)", async () => {
    const cartId = await seedCart();
    const ip = `qris-ip-${randomUUID()}`;
    const res = await createApp(pool).request("/api/v1/orders/generate-code", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": ip },
      body: genBody(),
    });
    assert.equal(res.status, 200);
    const { data } = (await res.json()) as { data: { order_id: string; unique_code: string } };
    createdOrders.push(data.order_id);
    const th = await createApp(pool).request(`/api/v1/thanks?ref=${data.unique_code}`, { headers: { cookie: `cart_id=${cartId}`, "x-forwarded-for": ip } });
    assert.equal(th.status, 200);
    const body = (await th.json()) as { data: { order_id: string } };
    assert.equal(body.data.order_id, data.order_id);
    assert.match(body.data.order_id, /^HP-\d{6}-\d{4}$/);
  });

  it("nomor WA tidak valid -> 400 INVALID_CONTACT", async () => {
    const cartId = await seedCart();
    const co = await createApp(pool).request("/api/v1/cart/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": `qris-ip-${randomUUID()}` },
      body: JSON.stringify({ mode: "instant", delivery_method: "pickup", customer_name: "Budi", customer_phone: "12345" }),
    });
    assert.equal(co.status, 400);
    const body = (await co.json()) as { code: string };
    assert.equal(body.code, "INVALID_CONTACT");
  });

  it("tanpa /cart/checkout -> order tetap instant + pickup (perilaku lama)", async () => {
    const cartId = await seedCart();
    const res = await createApp(pool).request("/api/v1/orders/generate-code", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": `qris-ip-${randomUUID()}` },
      body: genBody(),
    });
    assert.equal(res.status, 200);
    const { data } = (await res.json()) as { data: { order_id: string } };
    createdOrders.push(data.order_id);
    const { rows } = await pool.query("SELECT mode, scheduled_at, delivery_method, delivery_address FROM orders WHERE id = $1", [data.order_id]);
    assert.equal(rows[0].mode, "instant");
    assert.equal(rows[0].scheduled_at, null);
    assert.equal(rows[0].delivery_method, "pickup");
    assert.equal(rows[0].delivery_address, null);
  });

  it("jadwal yang sudah lewat saat generate-code -> jatuh ke instant (tidak gagal)", async () => {
    const cartId = await seedCart();
    const past = new Date(Date.now() - 3600 * 1000).toISOString();
    await pool.query("UPDATE carts SET checkout_choice = $2 WHERE id = $1", [cartId, JSON.stringify({ mode: "scheduled", scheduled_at: past, delivery_method: "pickup" })]);
    const res = await createApp(pool).request("/api/v1/orders/generate-code", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": `qris-ip-${randomUUID()}` },
      body: genBody(),
    });
    assert.equal(res.status, 200);
    const { data } = (await res.json()) as { data: { order_id: string } };
    createdOrders.push(data.order_id);
    const { rows } = await pool.query("SELECT mode, scheduled_at FROM orders WHERE id = $1", [data.order_id]);
    assert.equal(rows[0].mode, "instant");
    assert.equal(rows[0].scheduled_at, null);
  });

  it("generate-code: hitung total server dari cart, balik unique_code + qr_url + nominal", async () => {
    const cartId = await seedCart();
    const res = await createApp(pool).request("/api/v1/orders/generate-code", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF },
      body: genBody(),
    });
    assert.equal(res.status, 200);
    const { data } = (await res.json()) as { data: { unique_code: string; qr_url: string; nominal: number; order_id: string } };
    createdOrders.push(data.order_id);
    assert.match(data.unique_code, /^ORD-[0-9A-F]{12,}$/);
    assert.equal(data.qr_url.includes("qr.example"), true);
    assert.equal(data.nominal, 36000); // prod_pb_bar 18000 x 2
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
      body: genBody({ donation_consent: true }),
    });
    assert.equal(res.status, 200);
    const { data } = (await res.json()) as { data: { unique_code: string; order_id: string } };
    createdOrders.push(data.order_id);
    const row = await pool.query<{ donation_consent: boolean }>("SELECT donation_consent FROM orders WHERE id = $1", [data.order_id]);
    assert.equal(row.rows[0]?.donation_consent, true);
  });

  it("thanks: sertakan paid_amount + donation_consent", async () => {
    const cartId = await seedCart();
    const gen = await createApp(pool).request("/api/v1/orders/generate-code", { method: "POST", headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF }, body: genBody() });
    const { data } = (await gen.json()) as { data: { unique_code: string; order_id: string } };
    createdOrders.push(data.order_id);
    await pool.query("UPDATE orders SET paid_amount = 50000, donation_consent = TRUE WHERE id = $1", [data.order_id]);
    const owner = await createApp(pool).request(`/api/v1/thanks?ref=${data.unique_code}`, { headers: { cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF } });
    assert.equal(owner.status, 200);
    const body = (await owner.json()) as { data: Record<string, unknown> };
    assert.equal(body.data["paid_amount"], 50000);
    assert.equal(body.data["donation_consent"], true);
    assert.equal(body.data["mode"], "instant");
    assert.equal(body.data["delivery_method"], "pickup");
  });

  it("generate-code: keranjang dikosongkan setelah order dibuat", async () => {
    const cartId = await seedCart();
    const gen = await createApp(pool).request("/api/v1/orders/generate-code", { method: "POST", headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF }, body: genBody() });
    assert.equal(gen.status, 200);
    const { data } = (await gen.json()) as { data: { order_id: string } };
    createdOrders.push(data.order_id);
    const cart = await pool.query("SELECT count(*)::int AS n FROM cart_items WHERE cart_id = $1", [cartId]);
    assert.equal(Number(cart.rows[0]?.n), 0);
  });

  it("thanks: pemilik sesi -> 200 (kode+nominal+qr), sesi lain -> 404 seragam", async () => {
    const cartId = await seedCart();
    const gen = await createApp(pool).request("/api/v1/orders/generate-code", { method: "POST", headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF }, body: genBody() });
    const { data } = (await gen.json()) as { data: { unique_code: string; order_id: string } };
    createdOrders.push(data.order_id);

    const owner = await createApp(pool).request(`/api/v1/thanks?ref=${data.unique_code}`, { headers: { cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF } });
    assert.equal(owner.status, 200);
    const body = (await owner.json()) as { data: { unique_code: string; nominal: number; qr_url: string } };
    assert.equal(body.data.unique_code, data.unique_code);
    assert.equal(body.data.nominal, 36000);
    assert.equal(typeof body.data.qr_url, "string");
    assert.equal((body.data as Record<string, unknown>)["delivery_address"], null);
    assert.equal((body.data as Record<string, unknown>)["delivery_method"], "pickup");

    const other = await createApp(pool).request(`/api/v1/thanks?ref=${data.unique_code}`, { headers: { cookie: "cart_id=penyusup-lain", "x-forwarded-for": XFF } });
    assert.equal(other.status, 404);
  });

  it("thanks: ref tak ada -> 404", async () => {
    const res = await createApp(pool).request("/api/v1/thanks?ref=ORD-TIDAKADA", { headers: { cookie: "cart_id=x", "x-forwarded-for": XFF } });
    assert.equal(res.status, 404);
  });

  it("tanpa turnstile_token -> 400 VALIDATION_ERROR", async () => {
    const cartId = await seedCart();
    const res = await createApp(pool).request("/api/v1/orders/generate-code", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "VALIDATION_ERROR");
  });

  it("token palsu (siteverify false) -> 403 TURNSTILE_FAILED", async () => {
    siteverifyImpl = () => new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), { status: 200 });
    try {
      const cartId = await seedCart();
      const res = await createApp(pool).request("/api/v1/orders/generate-code", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF },
        body: genBody(),
      });
      assert.equal(res.status, 403);
      assert.equal(((await res.json()) as { code: string }).code, "TURNSTILE_FAILED");
    } finally {
      siteverifyImpl = () => new Response(JSON.stringify({ success: true, "error-codes": [] }), { status: 200 });
    }
  });

  it("honeypot terisi -> 403 tanpa panggil siteverify", async () => {
    let called = false;
    const prev = siteverifyImpl;
    siteverifyImpl = () => { called = true; return prev(); };
    try {
      const cartId = await seedCart();
      const res = await createApp(pool).request("/api/v1/orders/generate-code", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF },
        body: genBody({ website: "http://bot.example" }),
      });
      assert.equal(res.status, 403);
      assert.equal(called, false);
    } finally {
      siteverifyImpl = prev;
    }
  });

  it("generate kedua sesi sama <30 dtk -> 429 RATE_LIMITED", async () => {
    const cartId = await seedCart();
    const app = createApp(pool);
    const headers = { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF };
    const first = await app.request("/api/v1/orders/generate-code", { method: "POST", headers, body: genBody() });
    assert.equal(first.status, 200);
    createdOrders.push((((await first.json()) as { data: { order_id: string } }).data).order_id);
    await pool.query("INSERT INTO cart_items (item_id, cart_id, product_id, quantity, note) VALUES ($1, $2, 'prod_roasted_milktea', 1, NULL)", [randomUUID(), cartId]);
    const second = await app.request("/api/v1/orders/generate-code", { method: "POST", headers, body: genBody() });
    assert.equal(second.status, 429);
    assert.equal(((await second.json()) as { code: string }).code, "RATE_LIMITED");
  });

  it("pending >=3 sesi sama -> 429 walau jeda cukup", async () => {
    const cartId = await seedCart();
    const app = createApp(pool);
    const headers = { "content-type": "application/json", cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF };
    for (let i = 0; i < 3; i += 1) {
      const gen = await app.request("/api/v1/orders/generate-code", { method: "POST", headers, body: genBody() });
      assert.equal(gen.status, 200);
      const id = (((await gen.json()) as { data: { order_id: string } }).data).order_id;
      createdOrders.push(id);
      await pool.query("INSERT INTO cart_items (item_id, cart_id, product_id, quantity, note) VALUES ($1, $2, 'prod_roasted_milktea', 1, NULL)", [randomUUID(), cartId]);
      await pool.query("UPDATE orders SET created_at = CURRENT_TIMESTAMP - INTERVAL '61 seconds' WHERE id = $1", [id]);
    }
    const fourth = await app.request("/api/v1/orders/generate-code", { method: "POST", headers, body: genBody() });
    assert.equal(fourth.status, 429);
  });

  it("ember global: sesi beda tetap 429 saat order/menit penuh", async () => {
    const prev = process.env.GENERATE_GLOBAL_PER_MIN;
    process.env.GENERATE_GLOBAL_PER_MIN = "1";
    // Kosongkan ember: mundurkan semua order lama (DB test saja).
    await pool.query("UPDATE orders SET created_at = CURRENT_TIMESTAMP - INTERVAL '2 minutes'");
    try {
      const c1 = await seedCart();
      const first = await createApp(pool).request("/api/v1/orders/generate-code", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `cart_id=${c1}`, "x-forwarded-for": XFF },
        body: genBody(),
      });
      assert.equal(first.status, 200);
      createdOrders.push((((await first.json()) as { data: { order_id: string } }).data).order_id);
      // Sesi SEGAR (rotasi cart_id) tetap ditolak ember global.
      const c2 = await seedCart();
      const second = await createApp(pool).request("/api/v1/orders/generate-code", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `cart_id=${c2}`, "x-forwarded-for": XFF },
        body: genBody(),
      });
      assert.equal(second.status, 429);
      assert.equal(((await second.json()) as { code: string }).code, "RATE_LIMITED");
    } finally {
      if (prev === undefined) delete process.env.GENERATE_GLOBAL_PER_MIN; else process.env.GENERATE_GLOBAL_PER_MIN = prev;
    }
  });
});
