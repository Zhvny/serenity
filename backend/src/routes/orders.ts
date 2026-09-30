import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Pool } from "pg";
import { productRepo } from "../repos/products.js";
import { createOrder, deliveryError, getOrder, setStatus } from "../services/orders.js";

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
    const order = createOrder(body.items, body.mode, body.mode === "instant" ? null : (body.scheduled_at ?? null), total, body.delivery_method, delivery_address);
    return c.json({ status: "success", data: order });
  });
  r.get("/orders/:order_id", async (c) => {
    const order = getOrder(c.req.param("order_id"));
    return order === null
      ? c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404)
      : c.json({ status: "success", data: order });
  });
  r.put("/orders/:order_id/status", zValidator("json", statusSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400);
  }), async (c) => {
    const key = process.env.INTERNAL_KEY;
    if (key === undefined || c.req.header("x-internal-key") !== key) {
      return c.json({ status: "error", code: "INTERNAL_ONLY", message: "Khusus internal" }, 403);
    }
    const order = setStatus(c.req.param("order_id"), c.req.valid("json").status);
    return order === null
      ? c.json({ status: "error", code: "ORDER_NOT_FOUND", message: "Order tidak ditemukan" }, 404)
      : c.json({ status: "success", data: order });
  });
  return r;
}
