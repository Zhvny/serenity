import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { CartItem } from "../types.js";

type CartRow = { item_id: string; product_id: string; quantity: number; note: string | null };

async function ensureCart(pool: Pool, cartId: string): Promise<void> {
  await pool.query("INSERT INTO carts (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [cartId]);
}

export async function getCart(pool: Pool, cartId: string): Promise<CartItem[]> {
  const { rows } = await pool.query<CartRow>(
    "SELECT item_id, product_id, quantity, note FROM cart_items WHERE cart_id = $1 ORDER BY created_at",
    [cartId],
  );
  return rows.map((r) => ({ item_id: r.item_id, product_id: r.product_id, quantity: r.quantity, note: r.note }));
}

export async function addItem(pool: Pool, cartId: string, productId: string, quantity: number, note: string | null): Promise<CartItem> {
  await ensureCart(pool, cartId);
  // Dedupe: bila produk sama + note sama sudah ada, jumlahkan qty (clamp 10) alih-alih
  // membuat baris baru. NULL-safe match pakai IS NOT DISTINCT FROM.
  const existing = await pool.query<CartRow>(
    "SELECT item_id, product_id, quantity, note FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND note IS NOT DISTINCT FROM $3",
    [cartId, productId, note],
  );
  const row = existing.rows[0];
  if (row !== undefined) {
    const merged = Math.min(10, row.quantity + quantity);
    const upd = await pool.query<CartRow>(
      "UPDATE cart_items SET quantity = $3 WHERE cart_id = $1 AND item_id = $2 RETURNING item_id, product_id, quantity, note",
      [cartId, row.item_id, merged],
    );
    const u = upd.rows[0];
    if (u !== undefined) return { item_id: u.item_id, product_id: u.product_id, quantity: u.quantity, note: u.note };
  }
  const itemId = randomUUID();
  await pool.query(
    "INSERT INTO cart_items (item_id, cart_id, product_id, quantity, note) VALUES ($1, $2, $3, $4, $5)",
    [itemId, cartId, productId, quantity, note],
  );
  return { item_id: itemId, product_id: productId, quantity, note };
}

export async function updateItem(pool: Pool, cartId: string, itemId: string, quantity: number, note?: string | null): Promise<CartItem | null> {
  const sql = note === undefined
    ? "UPDATE cart_items SET quantity = $3 WHERE cart_id = $1 AND item_id = $2 RETURNING item_id, product_id, quantity, note"
    : "UPDATE cart_items SET quantity = $3, note = $4 WHERE cart_id = $1 AND item_id = $2 RETURNING item_id, product_id, quantity, note";
  const params = note === undefined ? [cartId, itemId, quantity] : [cartId, itemId, quantity, note];
  const { rows } = await pool.query<CartRow>(sql, params);
  const r = rows[0];
  return r === undefined ? null : { item_id: r.item_id, product_id: r.product_id, quantity: r.quantity, note: r.note };
}

export async function removeItem(pool: Pool, cartId: string, itemId: string): Promise<boolean> {
  const res = await pool.query("DELETE FROM cart_items WHERE cart_id = $1 AND item_id = $2", [cartId, itemId]);
  return (res.rowCount ?? 0) > 0;
}
