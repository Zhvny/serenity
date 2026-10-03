import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { closeRedis } from "../src/db/redis.js";
import type { Pool } from "pg";

const rows = [{ id: "prod_001", name: "Salad Quinoa Ayam Grilled", category_id: "cat_food", price: 45000, tags: ["high-protein"], image_url: null, description: null, is_active: true, calories_kcal: 320, protein_g: 28, carbs_g: 22, fat_g: 12, fiber_g: 6, sugar_g: 4, allergens: ["kacang"] }];
const catRows = [{ id: "cat_food", name: "Food", description: null }];
const pool = { query: async (text: string) => ({ rows: String(text).includes("FROM categories") ? catRows : rows }) } as unknown as Pool;

after(async () => { await closeRedis(); });

describe("menu", () => {
  it("GET /products 200 + bentuk Product", async () => {
    const res = await createApp(pool).request("/api/v1/products");
    assert.equal(res.status, 200);
    const body = await res.json() as { status: string; data: Array<{ id: string; price: number; nutrition: { calories_kcal: number } }> };
    assert.equal(body.data[0]?.id, "prod_001");
    assert.equal(body.data[0]?.nutrition.calories_kcal, 320);
  });
  it("GET /products/:id unknown → 404 PRODUCT_NOT_FOUND", async () => {
    const empty = { query: async () => ({ rows: [] }) } as unknown as Pool;
    const res = await createApp(empty).request("/api/v1/products/nope");
    assert.equal(res.status, 404);
  });
  it("GET /categories 200 + data kategori riil", async () => {
    const res = await createApp(pool).request("/api/v1/categories");
    assert.equal(res.status, 200);
    const body = await res.json() as { status: string; data: Array<{ id: string }> };
    assert.equal(body.data[0]?.id, "cat_food");
  });
  it("GET /products?category=BAD!! → 400 VALIDATION_ERROR", async () => {
    const res = await createApp(pool).request("/api/v1/products?category=BAD!!");
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "VALIDATION_ERROR");
  });
  it("GET /products/:id inactive → 404", async () => {
    const inactive = { query: async (text: string, vals: Array<string>) => ({ rows: vals[0] === "prod_off" || String(text).includes("FROM categories") ? [] : rows }) } as unknown as Pool;
    const res = await createApp(inactive).request("/api/v1/products/prod_off");
    assert.equal(res.status, 404);
  });

  it("GET /posts 200 + daftar post", async () => {
    const mock = { query: async (text: string) => ({ rows: String(text).includes("FROM posts") ? [{ id: "00000000-0000-0000-0000-000000000001", title: "T", body: "B", tag: "FunFact", product_id: null, created_at: new Date().toISOString() }] : [] }) } as unknown as Pool;
    const res = await createApp(mock).request("/api/v1/posts");
    assert.equal(res.status, 200);
    const body = await res.json() as { status: string; data: Array<{ title: string; tag: string }> };
    assert.equal(body.data[0]?.title, "T");
    assert.equal(body.data[0]?.tag, "FunFact");
  });
});
