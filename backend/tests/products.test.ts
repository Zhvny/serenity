import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { productRepo } from "../src/repos/products.js";
import type { Pool } from "pg";

function mockPool(rows: unknown[] = []) {
  return { query: async () => ({ rows }) } as unknown as Pool;
}

describe("productRepo create/deactivate/listAll", () => {
  it("create harga > 0 -> INSERT products + price di params", async () => {
    const seen: Array<{ text: string; vals: unknown[] }> = [];
    const pool = { query: async (text: string, vals: unknown[] = []) => { seen.push({ text, vals }); return { rows: [{ id: "p9" }] }; } } as unknown as Pool;
    const res = await productRepo(pool).create({ id: "p9", name: "X", category_id: "cat_food", price: 10000, tags: [], image_url: null, description: null });
    assert.equal(res.id, "p9");
    assert.match(seen[0]?.text ?? "", /INSERT INTO products/);
    assert.ok((seen[0]?.vals ?? []).includes(10000));
  });

  it("deactivate set is_active = FALSE (bukan DELETE) -> true", async () => {
    const seen: string[] = [];
    const pool = { query: async (text: string) => { seen.push(text); return { rows: [{ id: "p9" }] }; } } as unknown as Pool;
    const ok = await productRepo(pool).deactivate("p9");
    assert.equal(ok, true);
    assert.match(seen[0] ?? "", /is_active = FALSE/);
    assert.doesNotMatch(seen[0] ?? "", /DELETE FROM products/);
  });

  it("deactivate id unknown -> false", async () => {
    assert.equal(await productRepo(mockPool([])).deactivate("nope"), false);
  });

  it("listAll -> query tanpa filter is_active, ORDER BY name", async () => {
    const seen: string[] = [];
    const pool = { query: async (text: string) => { seen.push(text); return { rows: [] }; } } as unknown as Pool;
    await productRepo(pool).listAll();
    assert.match(seen[0] ?? "", /FROM products/);
    assert.match(seen[0] ?? "", /ORDER BY p\.name/);
    assert.doesNotMatch(seen[0] ?? "", /is_active = TRUE/);
  });

  it("mapper sertakan name_en/description_en (null aman)", async () => {
    const rows = [{ id: "p1", name: "A", category_id: "c", price: 1, tags: [], image_url: null, description: "D", is_active: true, name_en: "A en", description_en: null, calories_kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, fiber_g: 1, sugar_g: 1, allergens: [] }];
    const list = await productRepo(mockPool(rows)).listAll();
    assert.equal(list[0]?.name_en, "A en");
    assert.equal(list[0]?.description_en, null);
  });
});
