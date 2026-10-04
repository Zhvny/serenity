import { Hono } from "hono";
import type { Pool } from "pg";
import type { ApiSuccess } from "./types.js";
import { productRepo } from "./repos/products.js";
import { menuService } from "./services/menu.js";
import { menuRoutes } from "./routes/menu.js";
import { cartRoutes } from "./routes/cart.js";
import { orderRoutes } from "./routes/orders.js";
import { corsMw, loggerMw, tieredRateLimit, securityHeaders } from "./middleware/security.js";
import { issueCsrf, csrfMw } from "./middleware/csrf.js";
import { loginRoute, adminRoutes } from "./routes/admin.js";
import { qrisRoutes } from "./routes/qris.js";
import { internalRoutes } from "./routes/internal.js";
import { postRoutes } from "./routes/posts.js";
import { recommendRoutes } from "./routes/recommend.js";

export function createApp(pool: Pool): Hono {
  const app = new Hono().basePath("/api/v1");
  app.use(corsMw(), loggerMw(), securityHeaders(), tieredRateLimit());
  app.get("/health", (c) => c.json({ status: "success", data: { ok: true } } satisfies ApiSuccess<{ ok: boolean }>));
  app.get("/csrf", (c) => c.json({ status: "success", data: { csrfToken: issueCsrf(c) } }));
  // recommendRoutes sebelum menuRoutes: GET /products/recommendations statis
  // harus menang atas GET /products/:id.
  app.route("/", recommendRoutes(pool));
  app.route("/", menuRoutes(menuService(productRepo(pool))));
  app.route("/", cartRoutes(pool));
  app.route("/", orderRoutes(pool));
  app.route("/", qrisRoutes(pool));
  // Admin: CSRF (double-submit + Origin) di semua mutasi admin, lalu login + rute terproteksi.
  app.use("/admin/*", csrfMw());
  app.route("/admin", loginRoute(pool));
  app.route("/admin", adminRoutes(pool));
  app.route("/internal", internalRoutes(pool));
  app.route("/", postRoutes(pool));
  app.route("/", recommendRoutes(pool));
  app.notFound((c) => c.json({ status: "error", code: "NOT_FOUND", message: "Tidak ditemukan" }, 404));
  app.onError((_e, c) => {
    console.error(JSON.stringify({ route: c.req.path, msg: "internal" }));
    return c.json({ status: "error", code: "INTERNAL", message: "Kesalahan internal" }, 500);
  });
  return app;
}
