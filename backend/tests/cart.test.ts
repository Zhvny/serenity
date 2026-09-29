import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import type { Pool } from "pg";

const row = { id: "prod_001", name: "Test", category_id: "cat_1", price: 10000, tags: [], image_url: null, description: null, is_active: true, calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, allergens: [] };
const pool = { query: async (_text: string, params?: unknown[]) => ({ rows: params?.includes("prod_001") === true ? [row] : [] }) } as unknown as Pool;

describe("cart", () => {
  it("POST /cart/add qty 0 → 400", async () => {
    const res = await createApp(pool).request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "prod_001", quantity: 0 }) });
    assert.equal(res.status, 400);
  });
  it("POST /cart/add valid → 200 + Set-Cookie cart_id", async () => {
    const res = await createApp(pool).request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "prod_001", quantity: 2 }) });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("set-cookie") ?? "", /cart_id=/);
  });
  it("PUT /cart/items/:id qty 0 → 400", async () => {
    const app = createApp(pool);
    const add = await app.request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "prod_001", quantity: 1 }) });
    const cookie = add.headers.get("set-cookie") ?? "";
    const { data } = (await add.json()) as { data: { item_id: string } };
    const res = await app.request(`/api/v1/cart/items/${data.item_id}`, { method: "PUT", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ quantity: 0 }) });
    assert.equal(res.status, 400);
  });
  it("POST /cart/add qty 11 → 400", async () => {
    const res = await createApp(pool).request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "prod_001", quantity: 11 }) });
    assert.equal(res.status, 400);
  });
  it("POST /cart/add qty -1 → 400", async () => {
    const res = await createApp(pool).request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "prod_001", quantity: -1 }) });
    assert.equal(res.status, 400);
  });
  it("POST /cart/add tanpa product_id → 400 VALIDATION_ERROR", async () => {
    const res = await createApp(pool).request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quantity: 1 }) });
    assert.equal(res.status, 400);
    const json = (await res.json()) as { code: string };
    assert.equal(json.code, "VALIDATION_ERROR");
  });
  it("POST /cart/add produk unknown → 404 PRODUCT_NOT_FOUND", async () => {
    const res = await createApp(pool).request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "prod_nope", quantity: 1 }) });
    assert.equal(res.status, 404);
    const json = (await res.json()) as { code: string };
    assert.equal(json.code, "PRODUCT_NOT_FOUND");
  });
  it("PUT /cart/items/:id update note → 200", async () => {
    const app = createApp(pool);
    const add = await app.request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "prod_001", quantity: 1 }) });
    const cookie = add.headers.get("set-cookie") ?? "";
    const { data } = (await add.json()) as { data: { item_id: string } };
    const res = await app.request(`/api/v1/cart/items/${data.item_id}`, { method: "PUT", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ quantity: 2, note: "tanpa es" }) });
    assert.equal(res.status, 200);
    const updated = (await res.json()) as { data: { quantity: number; note: string | null } };
    assert.equal(updated.data.quantity, 2);
    assert.equal(updated.data.note, "tanpa es");
  });
  it("POST /cart/checkout instant+scheduled_at → 400", async () => {
    const res = await createApp(pool).request("/api/v1/cart/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "instant", scheduled_at: new Date(Date.now() + 3600000).toISOString() }) });
    assert.equal(res.status, 400);
  });
});
