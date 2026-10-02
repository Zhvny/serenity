import { Hono } from "hono";
import type { Pool } from "pg";
import { expireStale } from "../services/orders.js";

// Endpoint operasional internal (job expire terjadwal). Kunci via x-internal-key,
// bukan session admin — job tak punya cookie.
export function internalRoutes(pool: Pool): Hono {
  const r = new Hono();
  r.post("/expire", async (c) => {
    const key = process.env.INTERNAL_KEY;
    if (key === undefined || c.req.header("x-internal-key") !== key) {
      return c.json({ status: "error", code: "INTERNAL_ONLY", message: "Khusus internal" }, 403);
    }
    const n = await expireStale(pool, 2);
    await pool.query(`INSERT INTO audit_logs (actor, action, detail) VALUES ('system', 'auto_expire', $1)`, [JSON.stringify({ n })]);
    return c.json({ status: "success", data: { expired: n } });
  });
  return r;
}
