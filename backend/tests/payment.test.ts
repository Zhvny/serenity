import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createApp } from "../src/app.js";
import { paymentAudit } from "../src/routes/payment.js";
import type { Pool } from "pg";

process.env.MIDTRANS_SERVER_KEY = "test";
process.env.INTERNAL_KEY = "test-internal";
const productRow = { id: "prod_001", name: "P", category_id: "cat_food", price: 45000, tags: [], image_url: null, description: null, is_active: true, calories_kcal: 100, protein_g: 10, carbs_g: 10, fat_g: 5, fiber_g: 2, sugar_g: 1, allergens: [] };
const pool = { query: async (text: string) => ({ rows: String(text).includes("FROM products") ? [productRow] : [] }) } as unknown as Pool;
function signature(order_id: string, status_code: string, gross_amount: string): string {
  return createHash("sha512").update(`${order_id}${status_code}${gross_amount}test`).digest("hex");
}

describe("payment", () => {
  it("webhook signature salah → 403 tanpa ubah status", async () => {
    const app = createApp(pool);
    const res = await app.request("/api/v1/payment/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order_id: "HP-0001", status_code: "200", gross_amount: "45000", transaction_status: "settlement", signature_key: "salah" }) });
    assert.equal(res.status, 403);
  });
  it("webhook ganda order paid → tetap paid (idempoten)", async () => {
    const app = createApp(pool);
    const mkOrder = await app.request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ product_id: "prod_001", quantity: 1 }], mode: "instant" }) });
    assert.equal(mkOrder.status, 200);
    const { data: order } = (await mkOrder.json()) as { data: { order_id: string } };
    const body = { order_id: order.order_id, status_code: "200", gross_amount: "45000", transaction_status: "settlement", signature_key: signature(order.order_id, "200", "45000") };
    const r1 = await app.request("/api/v1/payment/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal(r1.status, 200);
    const r2 = await app.request("/api/v1/payment/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal(r2.status, 200);
    const d = (await (await app.request(`/api/v1/orders/${order.order_id}`)).json()) as { data: { status: string } };
    assert.equal(d.data.status, "paid");
  });
  it("POST /payment/create order unknown → 404", async () => {
    const app = createApp(pool);
    const res = await app.request("/api/v1/payment/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order_id: "HP-TIDAK-ADA" }) });
    assert.equal(res.status, 404);
  });
  it("webhook nominal beda → 409 tanpa ubah status/audit", async () => {
    const app = createApp(pool);
    const mkOrder = await app.request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ product_id: "prod_001", quantity: 1 }], mode: "instant" }) });
    assert.equal(mkOrder.status, 200);
    const { data: order } = (await mkOrder.json()) as { data: { order_id: string } };
    const before = paymentAudit.length;
    const body = { order_id: order.order_id, status_code: "200", gross_amount: "1", transaction_status: "settlement", signature_key: signature(order.order_id, "200", "1") };
    const res = await app.request("/api/v1/payment/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal(res.status, 409);
    assert.equal(((await res.json()) as { code: string }).code, "AMOUNT_MISMATCH");
    const d = (await (await app.request(`/api/v1/orders/${order.order_id}`)).json()) as { data: { status: string } };
    assert.equal(d.data.status, "pending_payment");
    assert.equal(paymentAudit.length, before);
  });
  it("POST /payment/create upstream down → 502", async () => {
    const app = createApp(pool);
    const mkOrder = await app.request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ product_id: "prod_001", quantity: 1 }], mode: "instant" }) });
    assert.equal(mkOrder.status, 200);
    const { data: order } = (await mkOrder.json()) as { data: { order_id: string } };
    const orig = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error("down"); };
    try {
      const res = await app.request("/api/v1/payment/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order_id: order.order_id }) });
      assert.equal(res.status, 502);
      assert.equal(((await res.json()) as { code: string }).code, "PAYMENT_UPSTREAM");
    } finally {
      globalThis.fetch = orig;
    }
  });
});
