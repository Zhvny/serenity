import { Hono } from "hono";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import type { Pool } from "pg";
import { productRepo } from "../repos/products.js";
import { createOrder, deliveryError, getOrder, setStatus, listMine, newCode, nextOrderId } from "../services/orders.js";

function cartIdOf(c: { req: { header: (n: string) => string | undefined } }): string | undefined {
  return c.req.header("cookie")?.match(/cart_id=([^;]+)/)?.[1];
}

const createSchema = z.object({
  items: z.array(z.object({ product_id: z.string().min(1), quantity: z.number().int().min(1).max(10) })).min(1),
  mode: z.enum(["instant", "scheduled"]),
  scheduled_at: z.string().datetime({ offset: true }).nullish(),
  delivery_method: z.enum(["pickup", "delivery"]).default("pickup"),
  delivery_address: z.string().nullish(),
});

const statusSchema = z.object({ status: z.enum(["paid", "failed", "expired"]) });

export function orderRoutes(pool: Pool): Hono {
  const r = new Hono();
  const products = productRepo(pool);
  r.post("/orders", zValidator("json", createSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400);
  }), async (c) => {
    const body = c.req.valid("json");
    if (body.mode === "instant" && body.scheduled_at != null) {
      return c.json({ status: "error", code: "INVALID_SCHEDULE", message: "scheduled_at harus null untuk mode instant" }, 400);
    }
    if (body.mode === "scheduled" && (body.scheduled_at == null || Date.parse(body.scheduled_at) < Date.now() + 24 * 3600 * 1000)) {
      return c.json({ status: "error", code: "INVALID_SCHEDULE", message: "scheduled_at minimal 24 jam ke depan" }, 400);
    }
    const delivery_address = body.delivery_address ?? null;
    const dErr = deliveryError(body.delivery_method, delivery_address);
    if (dErr !== null) {
      return c.json({ status: "error", code: "INVALID_ADDRESS", message: dErr }, 400);
    }
    let total = 0;
    for (const item of body.items) {
      const p = await products.getById(item.product_id);
      if (p === null) {
        return c.json({ status: "error", code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" }, 404);
      }
      total += p.price * item.quantity;
    }
    const order = await createOrder(pool, body.items, body.mode, body.mode === "instant" ? null : (body.scheduled_at ?? null), total, body.delivery_method, delivery_address, cartIdOf(c) ?? null);
    return c.json({ status: "success", data: order });
  });
  r.get("/orders/mine", async (c) => {
    // Terikat sesi (ADR-0001); tanpa cookie -> 404 seragam. Daftarkan SEBELUM /:order_id.
    const cartId = cartIdOf(c);
    if (cartId === undefined) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    const status = c.req.query("status");
    if (status !== undefined) {
      const allowed = new Set(["pending_payment", "paid", "underpaid", "expired", "failed", "cancelled", "preparing", "ready", "done"]);
      if (!allowed.has(status)) {
        return c.json({ status: "error", code: "INVALID_STATUS", message: "Status tidak valid" }, 400);
      }
    }
    return c.json({ status: "success", data: await listMine(pool, cartId, status) });
  });
  r.get("/orders/:order_id", async (c) => {
    // BOLA/ADR-0001: hanya pemilik sesi (cart_id) yang boleh melihat; sesi lain -> 404 seragam.
    const cartId = cartIdOf(c);
    const id = c.req.param("order_id");
    const { rows } = await pool.query<{ session_id: string | null }>("SELECT session_id FROM orders WHERE id = $1", [id]);
    const sess = rows[0]?.session_id;
    if (rows.length === 0 || cartId === undefined || sess !== cartId) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    const order = await getOrder(pool, id);
    if (order === null) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    // PII tulis-saja: jangan kembalikan delivery_address di GET.
    const { delivery_address: _omit, ...safe } = order;
    void _omit;
    return c.json({ status: "success", data: safe });
  });
  r.put("/orders/:order_id/status", zValidator("json", statusSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400);
  }), async (c) => {
    const key = process.env.INTERNAL_KEY ?? "";
    const got = c.req.header("x-internal-key") ?? "";
    // timingSafeEqual (bukan !==) agar tak ada oracle panjang-kunci; key kosong = tolak.
    const keyOk = key !== "" && got.length === key.length &&
      timingSafeEqual(Buffer.from(got), Buffer.from(key));
    if (!keyOk) {
      return c.json({ status: "error", code: "INTERNAL_ONLY", message: "Khusus internal" }, 403);
    }
    const order = await setStatus(pool, c.req.param("order_id"), c.req.valid("json").status);
    if (order === null) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    // Minimal: tanpa PII (delivery_address dkk) di respons.
    return c.json({ status: "success", data: { order_id: order.order_id, status: order.status } });
  });
  // Top-up selisih underpaid: order anak terpisah (nominal = sisa), max 1 level.
  r.post("/orders/:code/topup", async (c) => {
    const cartId = cartIdOf(c);
    const code = c.req.param("code");
    const cur = await pool.query<{
      id: string; total_amount: number; paid_amount: number | null; status: string; parent_code: string | null;
      mode: string; scheduled_at: Date | null; delivery_method: string; delivery_address: string | null;
      delivery_lat: string | null; delivery_lng: string | null; session_id: string | null; donation_consent: boolean;
    }>("SELECT id, total_amount, paid_amount, status, parent_code, mode, scheduled_at, delivery_method, delivery_address, delivery_lat, delivery_lng, session_id, donation_consent FROM orders WHERE unique_code = $1", [code]);
    const p = cur.rows[0];
    if (p === undefined || cartId === undefined || p.session_id !== cartId) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    const sisa = p.total_amount - (p.paid_amount ?? 0);
    if (p.status !== "underpaid" || p.parent_code !== null || sisa <= 0) {
      return c.json({ status: "error", code: "INVALID_TOPUP", message: "Top-up hanya untuk order underpaid level pertama" }, 409);
    }
    // Satu anak berjalan dalam satu waktu: tolak bila ada anak yang belum expired/cancelled.
    const open = await pool.query("SELECT 1 FROM orders WHERE parent_code = $1 AND status NOT IN ('expired','cancelled') LIMIT 1", [code]);
    if ((open.rowCount ?? 0) > 0) {
      return c.json({ status: "error", code: "INVALID_TOPUP", message: "Sudah ada kode top-up yang berjalan" }, 409);
    }
    const qrBase = process.env.QUASI_STATIC_QR_URL ?? "";
    const orderId = await nextOrderId(pool);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const childCode = newCode();
      const qrUrl = `${qrBase}?ref=${childCode}`;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "INSERT INTO orders (id, mode, scheduled_at, total_amount, status, delivery_method, delivery_address, delivery_lat, delivery_lng, session_id, unique_code, qr_url, parent_code, donation_consent) VALUES ($1, $2, $3, $4, 'pending_payment', $5, $6, $7, $8, $9, $10, $11, $12, $13)",
          [orderId, p.mode, p.scheduled_at, sisa, p.delivery_method, p.delivery_address, p.delivery_lat, p.delivery_lng, cartId, childCode, qrUrl, code, p.donation_consent],
        );
        await client.query(
          "INSERT INTO order_items (order_id, product_id, quantity, note, price_at_order) SELECT $1, product_id, quantity, note, price_at_order FROM order_items WHERE order_id = $2",
          [orderId, p.id],
        );
        // Aktivitas top-up me-reset jam expire parent.
        await client.query("UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE unique_code = $1", [code]);
        await client.query("COMMIT");
        return c.json({ status: "success", data: { order_id: orderId, unique_code: childCode, qr_url: qrUrl, nominal: sisa } });
      } catch (e) {
        try { await client.query("ROLLBACK"); } catch { /* abaikan, koneksi rusak */ }
        if (e instanceof Error && /unique/i.test(e.message)) continue;
        throw e;
      } finally {
        client.release();
      }
    }
    return c.json({ status: "error", code: "CODE_COLLISION", message: "Gagal membuat kode" }, 500);
  });
  return r;
}
