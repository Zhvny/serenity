import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import type { Pool } from "pg";

const pool = { query: async () => ({ rows: [] }) } as unknown as Pool;
const future = new Date(Date.now() + 25 * 3600 * 1000).toISOString();

describe("orders", () => {
  it("POST /orders scheduled <24 jam → 400 INVALID_SCHEDULE", async () => {
    const res = await createApp(pool).request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ product_id: "prod_001", quantity: 1 }], mode: "scheduled", scheduled_at: new Date(Date.now() + 3600 * 1000).toISOString() }) });
    assert.equal(res.status, 400);
  });
  it("POST /orders instant + scheduled_at → 400 INVALID_SCHEDULE", async () => {
    const res = await createApp(pool).request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ product_id: "prod_001", quantity: 1 }], mode: "instant", scheduled_at: future }) });
    assert.equal(res.status, 400);
  });
  it("PUT /orders/:id/status tanpa internal key → 403", async () => {
    const res = await createApp(pool).request("/api/v1/orders/HP-0001/status", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "paid" }) });
    assert.equal(res.status, 403);
  });
  it("POST /orders qty 11 → 400 VALIDATION_ERROR", async () => {
    const res = await createApp(pool).request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ product_id: "prod_001", quantity: 11 }], mode: "instant" }) });
    assert.equal(res.status, 400);
  });
});

describe("orders delivery", () => {
  const row = { id: "prod_001", name: "Test", category_id: "cat_1", price: 10000, tags: [], image_url: null, description: null, is_active: true, calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, allergens: [] };
  const prodPool = { query: async (_text: string, params?: unknown[]) => ({ rows: params?.includes("prod_001") === true ? [row] : [] }) } as unknown as Pool;
  const post = (body: unknown) => createApp(prodPool).request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const base = { items: [{ product_id: "prod_001", quantity: 1 }], mode: "instant" };

  it("delivery tanpa address → 400 INVALID_ADDRESS", async () => {
    const res = await post({ ...base, delivery_method: "delivery" });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("delivery address <10 char → 400 INVALID_ADDRESS", async () => {
    const res = await post({ ...base, delivery_method: "delivery", delivery_address: "jl a" });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("delivery address >500 char → 400 INVALID_ADDRESS", async () => {
    const res = await post({ ...base, delivery_method: "delivery", delivery_address: "a".repeat(501) });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("pickup + address terisi → 400 INVALID_ADDRESS", async () => {
    const res = await post({ ...base, delivery_method: "pickup", delivery_address: "Jl. Sehat No. 10 Jakarta" });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("delivery + address valid → 200 + echo field", async () => {
    const res = await post({ ...base, delivery_method: "delivery", delivery_address: "Jl. Sehat No. 10 Jakarta" });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { data: { delivery_method: string; delivery_address: string } };
    assert.equal(json.data.delivery_method, "delivery");
    assert.equal(json.data.delivery_address, "Jl. Sehat No. 10 Jakarta");
  });
});
