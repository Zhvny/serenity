import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";

// Daftar post publik (FunFact/News/SoftSelling), terbaru dulu. Tanpa auth.
export function postRoutes(pool: Pool): Hono {
  const r = new Hono();
  r.get("/posts", async (c) => {
    const { rows } = await pool.query<{ id: string; title: string; body: string; excerpt: string | null; tag: string; product_id: string | null; image_url: string | null; product_ids: string[]; created_at: Date }>(
      "SELECT id, title, body, excerpt, title_en, body_en, excerpt_en, tag, product_id, image_url, product_ids, created_at FROM posts WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100",
    );
    return c.json({ status: "success", data: rows });
  });
  // Trending per-tag (1 post per tag, tertinggi views 30 hari + terbaru). Daftar SEBELUM /:id.
  r.get("/posts/trending", async (c) => {
    const { rows } = await pool.query<{ id: string; title: string; body: string; excerpt: string | null; title_en: string | null; body_en: string | null; excerpt_en: string | null; tag: string; product_id: string | null; image_url: string | null; product_ids: string[]; created_at: Date }>(
      `SELECT p.id, p.title, p.body, p.excerpt, p.title_en, p.body_en, p.excerpt_en, p.tag, p.product_id, p.image_url, p.product_ids, p.created_at
       FROM posts p LEFT JOIN post_views v ON v.post_id = p.id AND v.viewed_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
       WHERE p.deleted_at IS NULL
       GROUP BY p.id ORDER BY COUNT(DISTINCT v.session_id) DESC, p.created_at DESC LIMIT 30`,
    );
    const seen = new Set<string>();
    const picked = rows.filter((p) => (seen.has(p.tag) ? false : (seen.add(p.tag), true))).slice(0, 3);
    return c.json({ status: "success", data: picked });
  });
  r.get("/posts/:id", async (c) => {
    const id = c.req.param("id");
    const { rows } = await pool.query<{ id: string; title: string; body: string; excerpt: string | null; tag: string; product_id: string | null; image_url: string | null; product_ids: string[]; created_at: Date }>(
      "SELECT id, title, body, excerpt, title_en, body_en, excerpt_en, tag, product_id, image_url, product_ids, created_at FROM posts WHERE id = $1 AND deleted_at IS NULL",
      [id],
    );
    const post = rows[0];
    if (post === undefined) {
      return c.json({ status: "error", code: "POST_NOT_FOUND", message: "Post tidak ditemukan" }, 404);
    }
    const ids = [...new Set([...(post.product_ids ?? []), ...(post.product_id === null ? [] : [post.product_id])])];
    const prods = ids.length === 0 ? [] : (await pool.query<{ id: string; name: string; name_en: string | null; price: number; image_url: string | null }>(
      "SELECT id, name, name_en, price, image_url FROM products WHERE id = ANY($1)", [ids])).rows;
    return c.json({ status: "success", data: { ...post, products: prods } });
  });
  // Catat view per session; idempoten (refresh tak dobel-hitung).
  // Param wajib UUID: id malformed → 404 langsung (pg bakal 500 bila lolos).
  r.post("/posts/:id/view", zValidator("param", z.object({ id: z.string().uuid() }), (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "POST_NOT_FOUND", message: "Post tidak ditemukan" }, 404);
  }), async (c) => {
    const id = c.req.valid("param").id;
    const exists = await pool.query("SELECT 1 FROM posts WHERE id = $1", [id]);
    if ((exists.rowCount ?? 0) === 0) {
      return c.json({ status: "error", code: "POST_NOT_FOUND", message: "Post tidak ditemukan" }, 404);
    }
    // Terbitkan cart_id bila absen (pola cart/add): tanpa ini semua anonim
    // runtuh jadi satu session "anon" dan distinct-count undercount permanen.
    let sid = c.req.header("cookie")?.match(/cart_id=([^;]+)/)?.[1];
    if (sid === undefined) {
      sid = randomUUID();
      c.header("Set-Cookie", `cart_id=${sid}; HttpOnly; SameSite=None; Secure; Path=/`);
    }
    await pool.query(
      "INSERT INTO post_views (post_id, session_id) VALUES ($1, $2) ON CONFLICT (post_id, session_id) DO NOTHING",
      [id, sid],
    );
    return c.json({ status: "success", data: { recorded: true } });
  });
  return r;
}
