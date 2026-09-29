import { Hono } from "hono";
import type { Pool } from "pg";
import type { ApiSuccess } from "./types.js";
import { productRepo } from "./repos/products.js";
import { menuService } from "./services/menu.js";
import { menuRoutes } from "./routes/menu.js";
import { cartRoutes } from "./routes/cart.js";
import { orderRoutes } from "./routes/orders.js";
import { paymentRoutes } from "./routes/payment.js";
import { corsMw, loggerMw, paymentRateLimit } from "./middleware/security.js";

export function createApp(pool: Pool): Hono {
  const app = new Hono().basePath("/api/v1");
  app.use(corsMw(), loggerMw(), paymentRateLimit());
  app.get("/health", (c) => c.json({ status: "success", data: { ok: true } } satisfies ApiSuccess<{ ok: boolean }>));
  app.route("/", menuRoutes(menuService(productRepo(pool))));
  app.route("/", cartRoutes(pool));
  app.route("/", orderRoutes(pool));
  app.route("/", paymentRoutes());
  app.notFound((c) => c.json({ status: "error", code: "NOT_FOUND", message: "Tidak ditemukan" }, 404));
  app.onError((e, c) => {
    console.error(e);
    return c.json({ status: "error", code: "INTERNAL", message: "Kesalahan internal" }, 500);
  });
  return app;
}
