import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Pool } from "pg";
import { productRepo } from "../repos/products.js";
import { createSession, destroySession, isLocked, recordLogin, sessionUser, verifyPassword } from "../services/adminAuth.js";

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const createSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category_id: z.string().min(1),
  price: z.number().int().min(1).max(10_000_000),
  tags: z.array(z.string()).optional(),
  image_url: z.string().nullish(),
  description: z.string().nullish(),
});

export function loginRoute(pool: Pool): Hono {
  const r = new Hono();
  r.post("/login", zValidator("json", loginSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400);
  }), async (c) => {
    const { username, password } = c.req.valid("json");
    if (await isLocked(pool, username)) {
      return c.json({ status: "error", code: "LOCKED", message: "Akun terkunci sementara" }, 429);
    }
    const valid = username === (process.env.ADMIN_USER ?? "") && verifyPassword(password);
    await recordLogin(pool, username, valid);
    if (!valid) {
      return c.json({ status: "error", code: "INVALID_CREDS", message: "Kredensial salah" }, 401);
    }
    const sessionId = await createSession(pool, username);
    c.header("Set-Cookie", `admin_session=${sessionId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${12 * 3600}`);
    return c.json({ status: "success", data: null });
  });
  r.post("/logout", async (c) => {
    const id = c.req.header("cookie")?.match(/admin_session=([^;]+)/)?.[1];
    if (id !== undefined) await destroySession(pool, id);
    c.header("Set-Cookie", "admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    return c.json({ status: "success", data: null });
  });
  return r;
}

type AdminVars = { adminUser: string };

export function adminRoutes(pool: Pool): Hono<{ Variables: AdminVars }> {
  const r = new Hono<{ Variables: AdminVars }>();
  const repo = productRepo(pool);

  r.use("*", async (c, next) => {
    const user = await sessionUser(pool, c.req.header("cookie"));
    if (user === null) {
      return c.json({ status: "error", code: "UNAUTH", message: "Login dulu" }, 401);
    }
    c.set("adminUser", user);
    await next();
  });

  r.get("/products", async (c) => {
    return c.json({ status: "success", data: await repo.listAll() });
  });

  r.post("/products", zValidator("json", createSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400);
  }), async (c) => {
    const body = c.req.valid("json");
    const created = await repo.create({ id: body.id, name: body.name, category_id: body.category_id, price: body.price, tags: body.tags ?? [], image_url: body.image_url ?? null, description: body.description ?? null });
    // audit_logs.order_id khusus order; aksi produk catat id di detail JSON.
    await pool.query(`INSERT INTO audit_logs (actor, action, detail) VALUES ($1, $2, $3)`, [c.get("adminUser"), "create_product", JSON.stringify({ id: created.id })]);
    return c.json({ status: "success", data: created });
  });

  r.post("/products/:id/deactivate", async (c) => {
    const id = c.req.param("id");
    const ok = await repo.deactivate(id);
    await pool.query(`INSERT INTO audit_logs (actor, action, detail) VALUES ($1, $2, $3)`, [c.get("adminUser"), "deactivate_product", JSON.stringify({ id })]);
    return c.json({ status: "success", data: { deactivated: ok } });
  });

  return r;
}
