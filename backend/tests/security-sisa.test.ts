import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { closeRedis } from "../src/db/redis.js";

const pool = createPool();
const XFF = `sec-sisa-${Date.now()}`;
const createdOrders: string[] = [];

after(async () => {
  for (const id of createdOrders) {
    await pool.query("DELETE FROM order_items WHERE order_id = $1", [id]);
    await pool.query("DELETE FROM orders WHERE id = $1", [id]);
  }
  await pool.end();
  await closeRedis();
});

describe("security sisa — headers", () => {
  it("respons bawa CSP + HSTS + nosniff + X-Frame + Referrer", async () => {
    const res = await createApp(pool).request("/api/v1/health", { headers: { "x-forwarded-for": XFF } });
    assert.ok(res.headers.get("content-security-policy"), "CSP absen");
    assert.ok(res.headers.get("strict-transport-security"), "HSTS absen");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.ok(res.headers.get("referrer-policy"), "Referrer-Policy absen");
  });
});

describe("security sisa — BOLA order visibility (ADR-0001)", () => {
  it("GET /orders/:id sesi lain / tanpa sesi -> 404 seragam (tak bocor PII)", async () => {
    // Buat order terikat cart tertentu.
    const cartId = `sec-cart-${randomUUID()}`;
    const orderId = `HP-SEC-${Date.now()}`;
    createdOrders.push(orderId);
    await pool.query(
      "INSERT INTO orders (id, mode, total_amount, status, delivery_method, delivery_address, session_id) VALUES ($1,'instant',45000,'pending_payment','delivery','Jl. Rahasia No. 1 Jakarta',$2)",
      [orderId, cartId],
    );

    // Sesi lain -> 404.
    const other = await createApp(pool).request(`/api/v1/orders/${orderId}`, { headers: { cookie: "cart_id=penyusup", "x-forwarded-for": XFF } });
    assert.equal(other.status, 404);
    const otherBody = await other.text();
    assert.doesNotMatch(otherBody, /Rahasia/, "alamat bocor ke sesi lain");

    // Tanpa sesi -> 404.
    const none = await createApp(pool).request(`/api/v1/orders/${orderId}`, { headers: { "x-forwarded-for": XFF } });
    assert.equal(none.status, 404);

    // Pemilik -> 200 tapi delivery_address TIDAK dikembalikan (PII tulis-saja).
    const owner = await createApp(pool).request(`/api/v1/orders/${orderId}`, { headers: { cookie: `cart_id=${cartId}`, "x-forwarded-for": XFF } });
    assert.equal(owner.status, 200);
    const ownerBody = await owner.text();
    assert.doesNotMatch(ownerBody, /Rahasia/, "delivery_address tak boleh dikembalikan di GET");
  });
});
