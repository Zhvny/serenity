import type { Pool } from "pg";
import type { Product } from "../types.js";

type Row = { id: string; name: string; category_id: string; price: number; tags: string[]; image_url: string | null; description: string | null; name_en: string | null; description_en: string | null; source: string; is_active: boolean; calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; sugar_g: number; allergens: string[] };

function toProduct(r: Row): Product {
  return { id: r.id, name: r.name, category_id: r.category_id, price: r.price, tags: r.tags, image_url: r.image_url, description: r.description, name_en: r.name_en, description_en: r.description_en, source: r.source, is_active: r.is_active, nutrition: { calories_kcal: r.calories_kcal, protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g, fiber_g: r.fiber_g, sugar_g: r.sugar_g }, allergens: r.allergens };
}

export function productRepo(pool: Pool) {
  return {
    async list(filter: { category?: string; tag?: string }): Promise<Product[]> {
      const conds: string[] = ["p.is_active = TRUE"];
      const vals: Array<string> = [];
      if (filter.category !== undefined) { vals.push(filter.category); conds.push(`p.category_id = $${vals.length}`); }
      if (filter.tag !== undefined) { vals.push(filter.tag); conds.push(`$${vals.length} = ANY(p.tags)`); }
      const { rows } = await pool.query(`SELECT p.*, n.calories_kcal, n.protein_g, n.carbs_g, n.fat_g, n.fiber_g, n.sugar_g, COALESCE(array_agg(a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS allergens FROM products p LEFT JOIN nutrition_info n ON n.product_id = p.id LEFT JOIN product_allergens pa ON pa.product_id = p.id LEFT JOIN allergens a ON a.id = pa.allergen_id WHERE ${conds.join(" AND ")} GROUP BY p.id, n.calories_kcal, n.protein_g, n.carbs_g, n.fat_g, n.fiber_g, n.sugar_g`, vals);
      return (rows as Row[]).map(toProduct);
    },
    async getById(id: string): Promise<Product | null> {
      const { rows } = await pool.query(`SELECT p.*, n.calories_kcal, n.protein_g, n.carbs_g, n.fat_g, n.fiber_g, n.sugar_g, COALESCE(array_agg(a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS allergens FROM products p LEFT JOIN nutrition_info n ON n.product_id = p.id LEFT JOIN product_allergens pa ON pa.product_id = p.id LEFT JOIN allergens a ON a.id = pa.allergen_id WHERE p.id = $1 AND p.is_active = TRUE GROUP BY p.id, n.calories_kcal, n.protein_g, n.carbs_g, n.fat_g, n.fiber_g, n.sugar_g`, [id]);
      const row = (rows as Row[])[0];
      return row === undefined ? null : toProduct(row);
    },
    async listCategories(): Promise<Array<{ id: string; name: string; description: string | null }>> {
      const { rows } = await pool.query(`SELECT id, name, description FROM categories ORDER BY name`, []);
      return rows as Array<{ id: string; name: string; description: string | null }>;
    },
    async create(input: { id: string; name: string; category_id: string; price: number; tags: string[]; image_url: string | null; description: string | null; name_en: string | null; description_en: string | null }): Promise<{ id: string }> {
      const { rows } = await pool.query(
        `INSERT INTO products (id, name, category_id, price, tags, image_url, description, name_en, description_en) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [input.id, input.name, input.category_id, input.price, input.tags, input.image_url, input.description, input.name_en, input.description_en],
      );
      return (rows as Array<{ id: string }>)[0] ?? { id: input.id };
    },
    async deactivate(id: string): Promise<boolean> {
      const { rows } = await pool.query(
        `UPDATE products SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = TRUE RETURNING id`,
        [id],
      );
      return rows.length > 0;
    },
    async reactivate(id: string): Promise<boolean> {
      const { rows } = await pool.query(
        `UPDATE products SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = FALSE RETURNING id`,
        [id],
      );
      return rows.length > 0;
    },
    async update(id: string, input: { name: string; category_id: string; price: number; tags: string[]; image_url: string | null; description: string | null; name_en: string | null; description_en: string | null }): Promise<boolean> {
      // Update field inti (ID immutable; nutrisi/alergen di luar scope form admin).
      const { rows } = await pool.query(
        `UPDATE products SET name = $2, category_id = $3, price = $4, tags = $5, image_url = $6, description = $7, name_en = $8, description_en = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
        [id, input.name, input.category_id, input.price, input.tags, input.image_url, input.description, input.name_en, input.description_en],
      );
      return rows.length > 0;
    },
    async listAll(): Promise<Product[]> {
      const { rows } = await pool.query(`SELECT p.*, n.calories_kcal, n.protein_g, n.carbs_g, n.fat_g, n.fiber_g, n.sugar_g, COALESCE(array_agg(a.name) FILTER (WHERE a.name IS NOT NULL), '{}') AS allergens FROM products p LEFT JOIN nutrition_info n ON n.product_id = p.id LEFT JOIN product_allergens pa ON pa.product_id = p.id LEFT JOIN allergens a ON a.id = pa.allergen_id GROUP BY p.id, n.calories_kcal, n.protein_g, n.carbs_g, n.fat_g, n.fiber_g, n.sugar_g ORDER BY p.name`, []);
      return (rows as Row[]).map(toProduct);
    },
  };
}
export type ProductRepo = ReturnType<typeof productRepo>;
