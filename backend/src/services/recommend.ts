import type { Pool } from "pg";

export type Need = "diet" | "muscle" | "diabetes" | "allergy_free" | "low_sugar";

const ORDER: Record<Need, string> = {
  diet: "n.calories_kcal ASC",
  muscle: "n.protein_g DESC",
  diabetes: "n.sugar_g ASC",
  low_sugar: "n.sugar_g ASC",
  allergy_free: "n.calories_kcal ASC",
};

export async function bestSellers(pool: Pool, limit: number): Promise<Array<{ id: string }>> {
  const { rows } = await pool.query(
    `SELECT oi.product_id AS id FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     JOIN products p ON p.id = oi.product_id
     WHERE o.status = 'done' AND p.is_active = TRUE
     GROUP BY oi.product_id ORDER BY SUM(oi.quantity) DESC LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function byNeed(pool: Pool, need: Need, limit: number): Promise<Array<{ id: string }>> {
  const allergy = need === "allergy_free" ? "AND NOT EXISTS (SELECT 1 FROM product_allergens pa WHERE pa.product_id = p.id)" : "";
  const { rows } = await pool.query(
    `SELECT p.id FROM products p JOIN nutrition_info n ON n.product_id = p.id
     WHERE p.is_active = TRUE ${allergy} ORDER BY ${ORDER[need]} LIMIT $1`,
    [limit],
  );
  return rows;
}
