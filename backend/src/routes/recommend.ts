import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { bestSellers, byNeed, type Need } from "../services/recommend.js";

const needSchema = z.object({ need: z.enum(["diet", "muscle", "diabetes", "allergy_free", "low_sugar"]) });

function cartIdOf(c: { req: { header: (n: string) => string | undefined } }): string | undefined {
  return c.req.header("cookie")?.match(/cart_id=([^;]+)/)?.[1];
}

export function recommendRoutes(pool: Pool): Hono {
  const r = new Hono();
  r.put("/preferences", zValidator("json", needSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "INVALID_NEED", message: "Kebutuhan tidak valid" }, 400);
  }), async (c) => {
    const { need } = c.req.valid("json");
    let sid = cartIdOf(c);
    if (sid === undefined) {
      sid = randomUUID();
      c.header("Set-Cookie", `cart_id=${sid}; HttpOnly; SameSite=Lax; Path=/`);
    }
    await pool.query(
      `INSERT INTO user_preferences (session_id, need, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (session_id) DO UPDATE SET need = $2, updated_at = CURRENT_TIMESTAMP`,
      [sid, need],
    );
    return c.json({ status: "success", data: { need } });
  });
  r.get("/preferences", async (c) => {
    const sid = cartIdOf(c);
    if (sid === undefined) return c.json({ status: "success", data: null });
    const { rows } = await pool.query<{ need: string }>("SELECT need FROM user_preferences WHERE session_id = $1", [sid]);
    const need = rows[0]?.need ?? null;
    return c.json({ status: "success", data: need === null ? null : { need } });
  });
  r.get("/products/recommendations", async (c) => {
    const sid = cartIdOf(c);
    let need: Need | null = null;
    if (sid !== undefined) {
      const { rows } = await pool.query<{ need: string }>("SELECT need FROM user_preferences WHERE session_id = $1", [sid]);
      need = (rows[0]?.need as Need | undefined) ?? null;
    }
    if (need === null) {
      return c.json({ status: "success", data: await bestSellers(pool, 3) });
    }
    const [matched, top] = await Promise.all([byNeed(pool, need, 2), bestSellers(pool, 1)]);
    const ids = [...matched, ...top.filter((b) => !matched.some((m) => m.id === b.id))];
    return c.json({ status: "success", data: ids.slice(0, 3) });
  });
  return r;
}
