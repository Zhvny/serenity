import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { bestSellers, byNeed, NEEDS, type Need } from "../services/recommend.js";

const needsSchema = z.object({
  needs: z.array(z.enum(["diet", "muscle", "diabetes", "allergy_free", "low_sugar"])).min(1).max(5)
    .refine((a) => new Set(a).size === a.length, { message: "Duplikat" }),
});

function cartIdOf(c: { req: { header: (n: string) => string | undefined } }): string | undefined {
  return c.req.header("cookie")?.match(/cart_id=([^;]+)/)?.[1];
}

export function recommendRoutes(pool: Pool): Hono {
  const r = new Hono();
  r.put("/preferences", zValidator("json", needsSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "INVALID_NEED", message: "Kebutuhan tidak valid" }, 400);
  }), async (c) => {
    const { needs } = c.req.valid("json");
    let sid = cartIdOf(c);
    if (sid === undefined) {
      sid = randomUUID();
      c.header("Set-Cookie", `cart_id=${sid}; HttpOnly; SameSite=None; Secure; Path=/`);
    }
    await pool.query(
      `INSERT INTO user_preferences (session_id, needs, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (session_id) DO UPDATE SET needs = $2, updated_at = CURRENT_TIMESTAMP`,
      [sid, needs],
    );
    return c.json({ status: "success", data: { needs } });
  });
  r.get("/preferences", async (c) => {
    const sid = cartIdOf(c);
    if (sid === undefined) return c.json({ status: "success", data: null });
    const { rows } = await pool.query<{ needs: string[] }>("SELECT needs FROM user_preferences WHERE session_id = $1", [sid]);
    const needs = rows[0]?.needs ?? null;
    return c.json({ status: "success", data: needs === null ? null : { needs } });
  });
  r.get("/products/recommendations", async (c) => {
    const sid = cartIdOf(c);
    // Nilai simpanan bisa basi bila CHECK berubah: validasi, fallback best-seller.
    let valid: Need[] = [];
    if (sid !== undefined) {
      const { rows } = await pool.query<{ needs: string[] }>("SELECT needs FROM user_preferences WHERE session_id = $1", [sid]);
      const raw = rows[0]?.needs ?? [];
      valid = [...new Set(raw)].filter((n): n is Need => (NEEDS as readonly string[]).includes(n)).slice(0, 2);
    }
    if (valid.length === 0) {
      return c.json({ status: "success", data: await bestSellers(pool, 3) });
    }
    // 1 produk terbaik per need + best-seller pengisi hingga 3, dedupe.
    const perNeed = await Promise.all(valid.map((n) => byNeed(pool, n, 1)));
    const matched = perNeed.flat();
    const have = new Set(matched.map((m) => m.id));
    const top = (await bestSellers(pool, 3)).filter((b) => !have.has(b.id));
    return c.json({ status: "success", data: [...matched, ...top].slice(0, 3) });
  });
  return r;
}
