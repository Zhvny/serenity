import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Pool } from "pg";
import { productRepo } from "../repos/products.js";
import { createSession, destroySession, isLocked, recordLogin, sessionUser, verifyPassword } from "../services/adminAuth.js";
import { markPaid } from "../services/orders.js";

const loginSchema = z.object({ username: z.string().min(1), password: z.string().min(1) });
const createSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category_id: z.string().min(1),
  price: z.number().int().min(1).max(10_000_000),
  tags: z.array(z.string()).optional(),
  image_url: z.string().nullish(),
  description: z.string().nullish(),
  name_en: z.string().max(200).nullish(),
  description_en: z.string().nullish(),
});
const updateSchema = z.object({
  name: z.string().min(1),
  category_id: z.string().min(1),
  price: z.number().int().min(1).max(10_000_000),
  tags: z.array(z.string()).optional(),
  image_url: z.string().nullish(),
  description: z.string().nullish(),
  name_en: z.string().max(200).nullish(),
  description_en: z.string().nullish(),
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
    const created = await repo.create({ id: body.id, name: body.name, category_id: body.category_id, price: body.price, tags: body.tags ?? [], image_url: body.image_url ?? null, description: body.description ?? null, name_en: body.name_en ?? null, description_en: body.description_en ?? null });
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

  r.post("/products/:id/reactivate", async (c) => {
    const id = c.req.param("id");
    const ok = await repo.reactivate(id);
    await pool.query(`INSERT INTO audit_logs (actor, action, detail) VALUES ($1, $2, $3)`, [c.get("adminUser"), "reactivate_product", JSON.stringify({ id })]);
    return c.json({ status: "success", data: { reactivated: ok } });
  });

  r.put("/products/:id", zValidator("json", updateSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400);
  }), async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const ok = await repo.update(id, { name: body.name, category_id: body.category_id, price: body.price, tags: body.tags ?? [], image_url: body.image_url ?? null, description: body.description ?? null, name_en: body.name_en ?? null, description_en: body.description_en ?? null });
    if (!ok) return c.json({ status: "error", code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" }, 404);
    await pool.query(`INSERT INTO audit_logs (actor, action, detail) VALUES ($1, $2, $3)`, [c.get("adminUser"), "update_product", JSON.stringify({ id })]);
    return c.json({ status: "success", data: { id } });
  });

  // Daftar order untuk konfirmasi (default: pending_payment). PII tulis-saja:
  // delivery_address/koordinat TIDAK dikembalikan di list.
  r.get("/orders", async (c) => {
    const status = c.req.query("status") ?? "pending_payment";
    const allowed = new Set(["pending_payment", "paid", "underpaid", "expired", "failed", "cancelled", "preparing", "ready", "done"]);
    if (!allowed.has(status)) {
      return c.json({ status: "error", code: "INVALID_STATUS", message: "Status tidak valid" }, 400);
    }
    const { rows } = await pool.query(
      `SELECT id, unique_code, total_amount, paid_amount, status, delivery_method, created_at
       FROM orders WHERE status = $1 ORDER BY created_at DESC LIMIT 200`,
      [status],
    );
    return c.json({ status: "success", data: rows });
  });

  // Transisi pemenuhan maju-ketat: paid -> preparing -> ready -> done. Tolak lompat/mundur.
  const NEXT: Record<string, string> = { paid: "preparing", preparing: "ready", ready: "done" };
  r.post("/orders/:code/advance", async (c) => {
    const code = c.req.param("code");
    const cur = await pool.query<{ status: string }>("SELECT status FROM orders WHERE unique_code = $1", [code]);
    const status = cur.rows[0]?.status;
    if (status === undefined) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    const next = NEXT[status];
    if (next === undefined) {
      return c.json({ status: "error", code: "INVALID_TRANSITION", message: `Tidak bisa memajukan dari status '${status}'` }, 409);
    }
    // Transisi atomik + aman balapan: hanya update bila status masih sama.
    const upd = await pool.query<{ status: string }>(
      "UPDATE orders SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE unique_code = $1 AND status = $3 RETURNING status",
      [code, next, status],
    );
    if (upd.rowCount === 0) {
      return c.json({ status: "error", code: "INVALID_TRANSITION", message: "Status berubah, muat ulang" }, 409);
    }
    await pool.query(`INSERT INTO audit_logs (actor, action, detail) VALUES ($1, $2, $3)`, [c.get("adminUser"), "advance_order", JSON.stringify({ unique_code: code, from: status, to: next })]);
    return c.json({ status: "success", data: { status: next } });
  });

  // Detail satu order (untuk konfirmasi admin): item + alamat bila delivery (PII, hanya di detail).
  r.get("/orders/:code", async (c) => {
    const code = c.req.param("code");
    const o = await pool.query<{ id: string; unique_code: string; total_amount: number; paid_amount: number | null; parent_code: string | null; status: string; mode: string; scheduled_at: Date | null; delivery_method: string; delivery_address: string | null; delivery_lat: string | null; delivery_lng: string | null; created_at: Date }>(
      `SELECT id, unique_code, total_amount, paid_amount, parent_code, status, mode, scheduled_at, delivery_method, delivery_address, delivery_lat, delivery_lng, created_at FROM orders WHERE unique_code = $1`,
      [code],
    );
    const order = o.rows[0];
    if (order === undefined) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    const items = await pool.query<{ product_id: string; name: string; quantity: number; note: string | null; price_at_order: number }>(
      `SELECT oi.product_id, p.name, oi.quantity, oi.note, oi.price_at_order FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`,
      [order.id],
    );
    // Info kelayakan Lunaskan: sisa vs total anak top-up yang sudah lunas.
    let settle_info: { sisa: number; anak_lunas: number; bisa: boolean } | null = null;
    if (order.status === "underpaid" && order.paid_amount !== null) {
      const sisa = order.total_amount - order.paid_amount;
      const sum = await pool.query<{ s: string }>(
        "SELECT COALESCE(SUM(paid_amount), 0) AS s FROM orders WHERE parent_code = $1 AND status = 'paid'", [code]);
      const anak = Number(sum.rows[0]?.s ?? 0);
      settle_info = { sisa, anak_lunas: anak, bisa: anak >= sisa };
    }
    return c.json({ status: "success", data: { ...order, items: items.rows, settle_info } });
  });

  // Mark-paid QRIS: catat nominal aktual; kurang -> underpaid, cukup/lebih -> paid.
  // Idempoten (hanya transisi dari pending_payment) + audit.
  const markPaidSchema = z.object({ paid_amount: z.number().int().min(1) });
  r.post("/orders/:code/mark-paid", zValidator("json", markPaidSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400);
  }), async (c) => {
    const code = c.req.param("code");
    const paidAmount = c.req.valid("json").paid_amount;
    const exists = await pool.query("SELECT 1 FROM orders WHERE unique_code = $1", [code]);
    if ((exists.rowCount ?? 0) === 0) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    const order = await markPaid(pool, code, paidAmount);
    const changed = order !== null;
    // Audit hanya saat transisi nyata terjadi (double-click -> satu catat).
    if (changed) {
      await pool.query(`INSERT INTO audit_logs (actor, action, detail) VALUES ($1, $2, $3)`, [c.get("adminUser"), "mark_paid", JSON.stringify({ unique_code: code, paid_amount: paidAmount })]);
    }
    return c.json({ status: "success", data: { paid: order?.status === "paid", changed, status: order?.status ?? null } });
  });

  // Buat post FunFact/News/SoftSelling (opsional kait produk).
  const postSchema = z.object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(10000),
    excerpt: z.string().max(300).nullish(),
    title_en: z.string().max(200).nullish(),
    body_en: z.string().nullish(),
    excerpt_en: z.string().max(300).nullish(),
    tag: z.enum(["FunFact", "News", "Research"]),
    product_id: z.string().min(1).nullish(),
    image_url: z.string().max(500).nullish(),
    product_ids: z.array(z.string().min(1)).max(10).nullish(),
  });
  r.post("/posts", zValidator("json", postSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400);
  }), async (c) => {
    const body = c.req.valid("json");
    if (body.product_id != null) {
      const prod = await pool.query("SELECT 1 FROM products WHERE id = $1", [body.product_id]);
      if ((prod.rowCount ?? 0) === 0) {
        return c.json({ status: "error", code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" }, 404);
      }
    }
    const pids = body.product_ids ?? [];
    for (const pid of pids) {
      const prod = await pool.query("SELECT 1 FROM products WHERE id = $1", [pid]);
      if ((prod.rowCount ?? 0) === 0) {
        return c.json({ status: "error", code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" }, 404);
      }
    }
    const ins = await pool.query<{ id: string }>(
      "INSERT INTO posts (title, body, excerpt, title_en, body_en, excerpt_en, tag, product_id, image_url, product_ids) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id",
      [body.title, body.body, body.excerpt ?? null, body.title_en ?? null, body.body_en ?? null, body.excerpt_en ?? null, body.tag, body.product_id ?? null, body.image_url ?? null, pids],
    );
    const id = ins.rows[0]?.id ?? "";
    await pool.query(`INSERT INTO audit_logs (actor, action, detail) VALUES ($1, $2, $3)`, [c.get("adminUser"), "create_post", JSON.stringify({ id })]);
    return c.json({ status: "success", data: { id } });
  });

  // Lunaskan parent underpaid secara manual: syarat anak lunas menutup sisa.
  r.post("/orders/:code/settle-parent", async (c) => {
    const code = c.req.param("code");
    const cur = await pool.query<{ total_amount: number; paid_amount: number | null; status: string }>(
      "SELECT total_amount, paid_amount, status FROM orders WHERE unique_code = $1", [code]);
    const p = cur.rows[0];
    if (p === undefined) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    if (p.status !== "underpaid" || p.paid_amount === null) {
      return c.json({ status: "error", code: "INVALID_SETTLE", message: "Hanya order underpaid yang bisa dilunaskan" }, 409);
    }
    const sisa = p.total_amount - p.paid_amount;
    const sum = await pool.query<{ s: string }>(
      "SELECT COALESCE(SUM(paid_amount), 0) AS s FROM orders WHERE parent_code = $1 AND status = 'paid'", [code]);
    if (Number(sum.rows[0]?.s ?? 0) < sisa) {
      return c.json({ status: "error", code: "INVALID_SETTLE", message: "Anak lunas belum menutup sisa" }, 409);
    }
    const upd = await pool.query(
      "UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE unique_code = $1 AND status = 'underpaid'", [code]);
    if ((upd.rowCount ?? 0) === 0) {
      return c.json({ status: "error", code: "INVALID_SETTLE", message: "Status berubah, muat ulang" }, 409);
    }
    await pool.query(`INSERT INTO audit_logs (actor, action, detail) VALUES ($1, $2, $3)`, [c.get("adminUser"), "settle_parent", JSON.stringify({ unique_code: code })]);
    return c.json({ status: "success", data: { status: "paid" } });
  });

  return r;
}
