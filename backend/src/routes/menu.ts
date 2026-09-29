import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { MenuService } from "../services/menu.js";

const querySchema = z.object({ category: z.string().max(50).regex(/^[a-z0-9_-]+$/i).optional(), tag: z.string().max(50).regex(/^[a-z0-9_-]+$/i).optional() });

export function menuRoutes(service: MenuService): Hono {
  const r = new Hono();
  r.get("/products", zValidator("query", querySchema, (result, c) => { if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: result.error.issues[0]?.message ?? "Input tidak valid" }, 400); }), async (c) => {
    const q = c.req.valid("query");
    const data = await service.listProducts({ category: q.category, tag: q.tag });
    return c.json({ status: "success", data });
  });
  r.get("/products/:id", async (c) => {
    const p = await service.getProduct(c.req.param("id"));
    return p === null ? c.json({ status: "error", code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" }, 404) : c.json({ status: "success", data: p });
  });
  r.get("/categories", async (c) => c.json({ status: "success", data: await service.listCategories() }));
  return r;
}
