import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { closeRedis } from "../src/db/redis.js";
import type { Pool } from "pg";

after(async () => { await closeRedis(); });

const pool = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as Pool;

describe("recommend", () => {
  it("PUT /preferences needs=[diet,muscle] → 200 + set-cookie cart_id bila absen", async () => {
    const res = await createApp(pool).request("/api/v1/preferences", {
      method: "PUT", headers: { "content-type": "application/json", "x-forwarded-for": "rec-multi" }, body: JSON.stringify({ needs: ["diet", "muscle"] }),
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("set-cookie") ?? "", /cart_id=/);
    const body = await res.json() as { status: string; data: { needs: string[] } };
    assert.deepEqual(body.data.needs, ["diet", "muscle"]);
  });
  it("PUT /preferences needs=[] atau isi aneh → 400 INVALID_NEED", async () => {
    for (const [i, b] of [{}, { needs: [] }, { needs: ["aneh"] }, { need: "diet" }].entries()) {
      const res = await createApp(pool).request("/api/v1/preferences", {
        method: "PUT", headers: { "content-type": "application/json", "x-forwarded-for": `rec-bad-${i}` }, body: JSON.stringify(b),
      });
      assert.equal(res.status, 400);
      assert.equal(((await res.json()) as { code: string }).code, "INVALID_NEED");
    }
  });
  it("GET /products/recommendations → 200 + array", async () => {
    const res = await createApp(pool).request("/api/v1/products/recommendations");
    assert.equal(res.status, 200);
    const body = await res.json() as { status: string; data: unknown[] };
    assert.ok(Array.isArray(body.data));
  });
  it("GET /products/recommendations + needs 2 → 1 per need + 1 best-seller", async () => {
    const shaped = {
      query: async (text: string) => {
        if (String(text).includes("FROM user_preferences")) return { rows: [{ needs: ["diet", "muscle"] }], rowCount: 1 };
        if (String(text).includes("nutrition_info")) {
          const m = String(text).match(/protein_g DESC|calories_kcal ASC|sugar_g ASC/);
          return { rows: [{ id: `n-${m?.[0]?.slice(0, 3) ?? "x"}`, name: "N", price: 1, image_url: null }], rowCount: 1 };
        }
        return { rows: [{ id: "b1", name: "B", price: 2, image_url: null }], rowCount: 1 };
      },
    } as unknown as Pool;
    const res = await createApp(shaped).request("/api/v1/products/recommendations", { headers: { cookie: "cart_id=sess-2", "x-forwarded-for": "rec-mix" } });
    assert.equal(res.status, 200);
    const body = await res.json() as { status: string; data: Array<{ id: string }> };
    assert.equal(body.data.length, 3);
    assert.ok(body.data.some((d) => d.id === "b1"));
  });
  it("GET /products/recommendations + need diet → SQL ambil nama + harga", async () => {
    const seen: string[] = [];
    const shaped = {
      query: async (text: string) => {
        seen.push(String(text));
        if (String(text).includes("FROM user_preferences")) return { rows: [{ needs: ["diet"] }], rowCount: 1 };
        return { rows: [{ id: "prod_001", name: "Salad", price: 45000, image_url: null }], rowCount: 1 };
      },
    } as unknown as Pool;
    const res = await createApp(shaped).request("/api/v1/products/recommendations", { headers: { cookie: "cart_id=sess-1" } });
    assert.equal(res.status, 200);
    const selects = seen.filter((t) => t.includes("FROM products") || t.includes("order_items"));
    assert.ok(selects.length > 0);
    for (const q of selects) {
      assert.match(q, /name/);
      assert.match(q, /price/);
      assert.match(q, /name_en/);
      assert.match(q, /category_id/);
    }
  });
  it("need simpanan tak dikenal → fallback best-seller", async () => {
    const shaped = {
      query: async (text: string) => {
        if (String(text).includes("FROM user_preferences")) return { rows: [{ needs: ["hacker"] }], rowCount: 1 };
        if (String(text).includes("nutrition_info")) return { rows: [{ id: "n1", name: "N", price: 1, image_url: null }], rowCount: 1 };
        return { rows: [{ id: "b1", name: "B", price: 2, image_url: null }], rowCount: 1 };
      },
    } as unknown as Pool;
    const res = await createApp(shaped).request("/api/v1/products/recommendations", { headers: { cookie: "cart_id=sess-9", "x-forwarded-for": "rec-stale" } });
    assert.equal(res.status, 200);
    const body = await res.json() as { status: string; data: Array<{ id: string }> };
    assert.deepEqual(body.data.map((d) => d.id), ["b1"]);
  });
});
