import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Pool } from "pg";
import { getOrder, setStatus } from "../services/orders.js";
import { createTransaction, verifyIpaymuCallback } from "../services/payment.js";
import { productRepo } from "../repos/products.js";
import type { OrderStatus } from "../types.js";

export type PaymentAudit = { order_id: string; from: string; to: string; at: string };

// ponytail: in-memory audit; ganti tabel DB bila butuh persistensi.
export const paymentAudit: PaymentAudit[] = [];

const createSchema = z.object({ order_id: z.string().min(1) });

const webhookSchema = z.object({
  reference_id: z.string().min(1).optional(),
  referenceId: z.string().min(1).optional(),
  status: z.string().min(1),
  status_code: z.union([z.string(), z.number()]).optional(),
  trx_id: z.union([z.string(), z.number()]).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  total: z.union([z.string(), z.number()]).optional(),
}).passthrough().superRefine((v, ctx) => {
  if (v.reference_id === undefined && v.referenceId === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "reference_id wajib diisi" });
  }
});

export function paymentRoutes(pool: Pool): Hono {
  const r = new Hono();
  const products = productRepo(pool);
  r.post("/payment/create", zValidator("json", createSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400);
  }), async (c) => {
    const body = c.req.valid("json");
    const order = getOrder(body.order_id);
    if (order === null) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    const items: Array<{ name: string; qty: number; price: number }> = [];
    for (const item of order.items) {
      const p = await products.getById(item.product_id);
      if (p === null) {
        return c.json({ status: "error", code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" }, 404);
      }
      items.push({ name: p.name, qty: item.quantity, price: p.price });
    }
    try {
      const tx = await createTransaction(order.order_id, order.total_amount, items);
      return c.json({ status: "success", data: tx });
    } catch {
      return c.json({ status: "error", code: "PAYMENT_UPSTREAM", message: "Gagal membuat transaksi pembayaran" }, 502);
    }
  });
  r.post("/payment/webhook", zValidator("json", webhookSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400);
  }), async (c) => {
    const raw = c.req.valid("json") as Record<string, unknown>;
    if (!verifyIpaymuCallback(raw, c.req.header("x-signature") ?? "", process.env.IPAYMU_VA ?? "")) {
      return c.json({ status: "error", code: "WEBHOOK_FORBIDDEN", message: "Signature tidak valid" }, 403);
    }
    const referenceId = String(raw["reference_id"] ?? raw["referenceId"]);
    const order = getOrder(referenceId);
    if (order === null) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    if (Number(raw["amount"] ?? raw["total"]) !== order.total_amount) {
      return c.json({ status: "error", code: "AMOUNT_MISMATCH", message: "Nominal tidak sesuai order" }, 409);
    }
    const status = String(raw["status"]);
    if (status !== "berhasil" && status !== "expired") {
      return c.json({ status: "success", data: order });
    }
    const to: OrderStatus = status === "berhasil" ? "paid" : "expired";
    if (order.status !== "pending_payment") {
      return c.json({ status: "success", data: order });
    }
    const from = order.status;
    const updated = setStatus(order.order_id, to);
    paymentAudit.push({ order_id: order.order_id, from, to, at: new Date().toISOString() });
    return c.json({ status: "success", data: updated });
  });
  return r;
}
