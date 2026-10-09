import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { addItem, getCart, removeItem, updateItem } from "../services/cart.js";
import { deliveryError } from "../services/orders.js";
import { productRepo } from "../repos/products.js";

const addSchema = z.object({ product_id: z.string().min(1), quantity: z.number().int().min(1).max(10), note: z.string().max(200).nullish() });
const updateSchema = z.object({ quantity: z.number().int().min(1).max(10), note: z.string().max(200).nullish() });
const checkoutSchema = z.object({ mode: z.enum(["instant", "scheduled"]), scheduled_at: z.string().datetime({ offset: true }).nullish(), delivery_method: z.enum(["pickup", "delivery"]).default("pickup"), delivery_address: z.string().nullish(), delivery_lat: z.number().min(-90).max(90).nullish(), delivery_lng: z.number().min(-180).max(180).nullish() });

function cartIdOf(c: { req: { header: (n: string) => string | undefined } }): string | undefined {
  return c.req.header("cookie")?.match(/cart_id=([^;]+)/)?.[1];
}

export function cartRoutes(pool: Pool): Hono {
  const r = new Hono();
  const products = productRepo(pool);
  r.post("/cart/add", zValidator("json", addSchema, (result, c) => { if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: "Input tidak valid" }, 400); }), async (c) => {
    const body = c.req.valid("json");
    if (await products.getById(body.product_id) === null) {
      return c.json({ status: "error", code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" }, 404);
    }
    let cartId = cartIdOf(c);
    if (cartId === undefined) {
      cartId = randomUUID();
      c.header("Set-Cookie", `cart_id=${cartId}; HttpOnly; SameSite=None; Secure; Path=/`);
    }
    const item = await addItem(pool, cartId, body.product_id, body.quantity, body.note ?? null);
    return c.json({ status: "success", data: item });
  });
  r.get("/cart", async (c) => {
    return c.json({ status: "success", data: await getCart(pool, cartIdOf(c) ?? "") });
  });
  r.put("/cart/items/:item_id", zValidator("json", updateSchema, (result, c) => { if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: "Input tidak valid" }, 400); }), async (c) => {
    const body = c.req.valid("json");
    const item = await updateItem(pool, cartIdOf(c) ?? "", c.req.param("item_id"), body.quantity, body.note);
    return item === null ? c.json({ status: "error", code: "CART_ITEM_NOT_FOUND", message: "Item tidak ditemukan" }, 404) : c.json({ status: "success", data: item });
  });
  r.delete("/cart/items/:item_id", async (c) => {
    const ok = await removeItem(pool, cartIdOf(c) ?? "", c.req.param("item_id"));
    return !ok ? c.json({ status: "error", code: "CART_ITEM_NOT_FOUND", message: "Item tidak ditemukan" }, 404) : c.json({ status: "success", data: { removed: true } });
  });
  r.post("/cart/checkout", zValidator("json", checkoutSchema, (result, c) => { if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: "Input tidak valid" }, 400); }), async (c) => {
    const body = c.req.valid("json");
    if (body.mode === "instant" && body.scheduled_at != null) {
      return c.json({ status: "error", code: "INVALID_SCHEDULE", message: "scheduled_at harus null untuk mode instant" }, 400);
    }
    if (body.mode === "scheduled" && (body.scheduled_at == null || Date.parse(body.scheduled_at) <= Date.now())) {
      return c.json({ status: "error", code: "INVALID_SCHEDULE", message: "scheduled_at harus ISO masa depan" }, 400);
    }
    const delivery_address = body.delivery_address ?? null;
    const dErr = deliveryError(body.delivery_method, delivery_address);
    if (dErr !== null) {
      return c.json({ status: "error", code: "INVALID_ADDRESS", message: dErr }, 400);
    }
    return c.json({ status: "success", data: { mode: body.mode, delivery_method: body.delivery_method, delivery_address, delivery_lat: body.delivery_lat ?? null, delivery_lng: body.delivery_lng ?? null, items: await getCart(pool, cartIdOf(c) ?? "") } });
  });
  return r;
}
