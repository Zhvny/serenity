import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getOrder, setStatus } from "../services/orders.js";
import { createTransaction, verifySignature } from "../services/payment.js";
import type { OrderStatus } from "../types.js";

export type PaymentAudit = { order_id: string; from: string; to: string; at: string };

// ponytail: in-memory audit; ganti tabel DB bila butuh persistensi.
export const paymentAudit: PaymentAudit[] = [];

const createSchema = z.object({ order_id: z.string().min(1) });

const webhookSchema = z.object({
  order_id: z.string().min(1),
  status_code: z.string().default("200"),
  gross_amount: z.string().default("0"),
  transaction_status: z.string().min(1),
  signature_key: z.string().min(1),
});

export function paymentRoutes(): Hono {
  const r = new Hono();
  r.post("/payment/create", zValidator("json", createSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400);
  }), async (c) => {
    const body = c.req.valid("json");
    const order = getOrder(body.order_id);
    if (order === null) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    try {
      const tx = await createTransaction(order.order_id, order.total_amount);
      return c.json({ status: "success", data: tx });
    } catch {
      return c.json({ status: "error", code: "PAYMENT_UPSTREAM", message: "Gagal membuat transaksi pembayaran" }, 502);
    }
  });
  r.post("/payment/webhook", zValidator("json", webhookSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400);
  }), async (c) => {
    const body = c.req.valid("json");
    if (!verifySignature(body.order_id, body.status_code, body.gross_amount, body.signature_key)) {
      return c.json({ status: "error", code: "WEBHOOK_FORBIDDEN", message: "Signature tidak valid" }, 403);
    }
    const order = getOrder(body.order_id);
    if (order === null) {
      return c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404);
    }
    if (Number(body.gross_amount) !== order.total_amount) {
      return c.json({ status: "error", code: "AMOUNT_MISMATCH", message: "Nominal tidak sesuai order" }, 409);
    }
    const to: OrderStatus =
      body.transaction_status === "settlement" || body.transaction_status === "capture"
        ? "paid"
        : body.transaction_status === "expire"
          ? "expired"
          : "failed";
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
