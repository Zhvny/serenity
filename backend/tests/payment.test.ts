import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createApp } from "../src/app.js";
import { paymentAudit } from "../src/routes/payment.js";
import { buildIpaymuSignature, verifyIpaymuCallback } from "../src/services/payment.js";
import type { Pool } from "pg";

process.env.IPAYMU_VA = "test-va";
process.env.IPAYMU_API_KEY = "test-key";
process.env.INTERNAL_KEY = "test-internal";
const productRow = { id: "prod_001", name: "P", category_id: "cat_food", price: 45000, tags: [], image_url: null, description: null, is_active: true, calories_kcal: 100, protein_g: 10, carbs_g: 10, fat_g: 5, fiber_g: 2, sugar_g: 1, allergens: [] };
const pool = { query: async (text: string) => ({ rows: String(text).includes("FROM products") ? [productRow] : [] }) } as unknown as Pool;

function signCallback(payload: Record<string, unknown>): string {
  const INT = new Set(["trx_id", "status_code", "transaction_status_code", "paid_off"]);
  const n: Record<string, unknown> = {};
  for (const k of Object.keys(payload)) {
    const v = payload[k];
    if (INT.has(k)) n[k] = typeof v === "number" ? v : Number.parseInt(String(v), 10);
    else if (k === "is_escrow") n[k] = v === true || v === 1 || v === "1" ? true : v === false || v === 0 || v === "0" ? false : Boolean(v);
    else if (k === "additional_info") n[k] = v ?? [];
    else n[k] = v;
  }
  if (!("additional_info" in n)) n["additional_info"] = [];
  const s: Record<string, unknown> = {};
  for (const k of Object.keys(n).sort()) s[k] = n[k];
  return createHmac("sha256", "test-va").update(JSON.stringify(s).replace(/\//g, "\\/")).digest("hex");
}

async function mkOrder(app: ReturnType<typeof createApp>): Promise<{ order_id: string }> {
  const res = await app.request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ product_id: "prod_001", quantity: 1 }], mode: "instant" }) });
  assert.equal(res.status, 200);
  return ((await res.json()) as { data: { order_id: string } }).data;
}

async function postWebhook(app: ReturnType<typeof createApp>, payload: Record<string, unknown>, sig?: string): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (sig !== undefined) headers["x-signature"] = sig;
  return app.request("/api/v1/payment/webhook", { method: "POST", headers, body: JSON.stringify(payload) });
}

function mockFetch(body: unknown, status = 200): () => void {
  const orig = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  return () => { globalThis.fetch = orig; };
}

describe("payment ipaymu", () => {
  it("vektor signature create (hardcoded per rumus)", () => {
    assert.equal(buildIpaymuSignature("POST", "VA123", '{"product":["P"],"qty":[1]}', "KEY123"), "8a92682ea73b4102472f1c43da1db7ebd4b1419dbec20dc81350cc8c5d4e7cd6");
  });
  it("vektor signature callback (hardcoded per rumus)", () => {
    const payload = { trx_id: "77", status: "berhasil", status_code: "1", amount: "45000", reference_id: "HP-01", is_escrow: "0" };
    assert.equal(signCallback(payload), "e61f3fa1c9f0dc64b705618a40013f1366a7c47943f330f64f6cbb6257f7d37c");
    assert.equal(verifyIpaymuCallback(payload, "e61f3fa1c9f0dc64b705618a40013f1366a7c47943f330f64f6cbb6257f7d37c", "test-va"), true);
  });
  it("POST /payment/create sukses → {transaction_token, redirect_url}", async () => {
    const app = createApp(pool);
    const order = await mkOrder(app);
    const restore = mockFetch({ Status: 200, Message: "ok", Data: { SessionID: "S1", Url: "https://pay" } });
    try {
      const res = await app.request("/api/v1/payment/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order_id: order.order_id }) });
      assert.equal(res.status, 200);
      assert.deepEqual(((await res.json()) as { data: unknown }).data, { transaction_token: "S1", redirect_url: "https://pay" });
    } finally {
      restore();
    }
  });
  it("POST /payment/create order unknown → 404", async () => {
    const app = createApp(pool);
    const res = await app.request("/api/v1/payment/create", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order_id: "HP-TIDAK-ADA" }) });
    assert.equal(res.status, 404);
  });
  it("POST /payment/create upstream down → 502", async () => {
    const app = createApp(pool);
    const order = await mkOrder(app);
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
  it("webhook berhasil → paid", async () => {
    const app = createApp(pool);
    const order = await mkOrder(app);
    const payload = { reference_id: order.order_id, status: "berhasil", status_code: 1, trx_id: 77, amount: "45000" };
    const res = await postWebhook(app, payload, signCallback(payload));
    assert.equal(res.status, 200);
    assert.equal((((await res.json()) as { data: { status: string } }).data.status), "paid");
  });
  it("webhook signature salah → 403 tanpa ubah status", async () => {
    const app = createApp(pool);
    const order = await mkOrder(app);
    const res = await postWebhook(app, { reference_id: order.order_id, status: "berhasil", status_code: 1, trx_id: 77, amount: "45000" }, "salah");
    assert.equal(res.status, 403);
    const d = (await (await app.request(`/api/v1/orders/${order.order_id}`)).json()) as { data: { status: string } };
    assert.equal(d.data.status, "pending_payment");
  });
  it("webhook nominal beda → 409 tanpa ubah status/audit", async () => {
    const app = createApp(pool);
    const order = await mkOrder(app);
    const before = paymentAudit.length;
    const payload = { reference_id: order.order_id, status: "berhasil", status_code: 1, trx_id: 77, amount: "1" };
    const res = await postWebhook(app, payload, signCallback(payload));
    assert.equal(res.status, 409);
    assert.equal(((await res.json()) as { code: string }).code, "AMOUNT_MISMATCH");
    const d = (await (await app.request(`/api/v1/orders/${order.order_id}`)).json()) as { data: { status: string } };
    assert.equal(d.data.status, "pending_payment");
    assert.equal(paymentAudit.length, before);
  });
  it("webhook ganda order paid → tetap paid (idempoten)", async () => {
    const app = createApp(pool);
    const order = await mkOrder(app);
    const payload = { referenceId: order.order_id, status: "berhasil", status_code: 1, trx_id: 78, total: 45000 };
    const sig = signCallback(payload);
    assert.equal((await postWebhook(app, payload, sig)).status, 200);
    assert.equal((await postWebhook(app, payload, sig)).status, 200);
    const d = (await (await app.request(`/api/v1/orders/${order.order_id}`)).json()) as { data: { status: string } };
    assert.equal(d.data.status, "paid");
  });
  it("webhook expired → expired", async () => {
    const app = createApp(pool);
    const order = await mkOrder(app);
    const payload = { reference_id: order.order_id, status: "expired", status_code: 1, trx_id: 79, amount: 45000 };
    const res = await postWebhook(app, payload, signCallback(payload));
    assert.equal(res.status, 200);
    assert.equal((((await res.json()) as { data: { status: string } }).data.status), "expired");
  });
  it("webhook pending → tetap pending 200", async () => {
    const app = createApp(pool);
    const order = await mkOrder(app);
    const payload = { reference_id: order.order_id, status: "pending", status_code: 0, trx_id: 80, amount: 45000 };
    const res = await postWebhook(app, payload, signCallback(payload));
    assert.equal(res.status, 200);
    assert.equal((((await res.json()) as { data: { status: string } }).data.status), "pending_payment");
  });
});
