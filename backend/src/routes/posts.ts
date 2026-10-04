import { Hono } from "hono";
import type { Pool } from "pg";

// Daftar post publik (FunFact/News/SoftSelling), terbaru dulu. Tanpa auth.
export function postRoutes(pool: Pool): Hono {
  const r = new Hono();
  r.get("/posts", async (c) => {
    const { rows } = await pool.query<{ id: string; title: string; body: string; excerpt: string | null; tag: string; product_id: string | null; image_url: string | null; product_ids: string[]; created_at: Date }>(
      "SELECT id, title, body, excerpt, tag, product_id, image_url, product_ids, created_at FROM posts ORDER BY created_at DESC LIMIT 100",
    );
    return c.json({ status: "success", data: rows });
  });
  r.get("/posts/:id", async (c) => {
    const id = c.req.param("id");
    const { rows } = await pool.query<{ id: string; title: string; body: string; excerpt: string | null; tag: string; product_id: string | null; image_url: string | null; product_ids: string[]; created_at: Date }>(
      "SELECT id, title, body, excerpt, tag, product_id, image_url, product_ids, created_at FROM posts WHERE id = $1",
      [id],
    );
    const post = rows[0];
    if (post === undefined) {
      return c.json({ status: "error", code: "POST_NOT_FOUND", message: "Post tidak ditemukan" }, 404);
    }
    const ids = [...new Set([...(post.product_ids ?? []), ...(post.product_id === null ? [] : [post.product_id])])];
    const prods = ids.length === 0 ? [] : (await pool.query<{ id: string; name: string; price: number; image_url: string | null }>(
      "SELECT id, name, price, image_url FROM products WHERE id = ANY($1)", [ids])).rows;
    return c.json({ status: "success", data: { ...post, products: prods } });
  });
  return r;
}
