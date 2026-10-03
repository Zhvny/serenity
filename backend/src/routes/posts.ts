import { Hono } from "hono";
import type { Pool } from "pg";

// Daftar post publik (FunFact/News/SoftSelling), terbaru dulu. Tanpa auth.
export function postRoutes(pool: Pool): Hono {
  const r = new Hono();
  r.get("/posts", async (c) => {
    const { rows } = await pool.query<{ id: string; title: string; body: string; tag: string; product_id: string | null; created_at: Date }>(
      "SELECT id, title, body, tag, product_id, created_at FROM posts ORDER BY created_at DESC LIMIT 100",
    );
    return c.json({ status: "success", data: rows });
  });
  return r;
}
