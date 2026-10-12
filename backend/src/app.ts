import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import type { ApiSuccess } from "./types.js";
import { productRepo } from "./repos/products.js";
import { menuService } from "./services/menu.js";
import { menuRoutes } from "./routes/menu.js";
import { cartRoutes } from "./routes/cart.js";
import { orderRoutes } from "./routes/orders.js";
import { corsMw, loggerMw, tieredRateLimit, securityHeaders } from "./middleware/security.js";
import { issueCsrf, csrfMw, originMw } from "./middleware/csrf.js";
import { loginRoute, adminRoutes } from "./routes/admin.js";
import { qrisRoutes } from "./routes/qris.js";
import { internalRoutes } from "./routes/internal.js";
import { postRoutes } from "./routes/posts.js";
import { recommendRoutes } from "./routes/recommend.js";

// Path log disanitasi: dikendalikan penyerang (CRLF/ANSI injection ke log).
export function safeLogPath(path: string): string {
  return path.replace(/[\r\n\x1b]/g, "").slice(0, 200);
}

export function createApp(pool: Pool): Hono {  const app = new Hono().basePath("/api/v1");
  app.use(corsMw(), loggerMw(), securityHeaders(), tieredRateLimit(), originMw());
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
  app.notFound((c) => c.json({ status: "error", code: "NOT_FOUND", message: "Tidak ditemukan" }, 404));
  app.onError((e, c) => {
    // Sanitasi: path dikendalikan penyerang (CRLF/ANSI injection ke log).
    console.error(JSON.stringify({ route: safeLogPath(c.req.path), msg: "internal" }));
    // Diagnostik berpagar: pesan error asli hanya bila x-debug-key cocok (job/owner).
    const dbg = c.req.header("x-debug-key");
    const key = process.env.INTERNAL_KEY ?? "";
    if (dbg !== undefined && key !== "" && dbg.length === key.length && timingSafeEqual(Buffer.from(dbg), Buffer.from(key))) {
      const msg = e instanceof Error ? e.message.slice(0, 300) : "unknown";
      return c.json({ status: "error", code: "INTERNAL", message: "Kesalahan internal", debug: msg }, 500);
    }
    return c.json({ status: "error", code: "INTERNAL", message: "Kesalahan internal" }, 500);
  });
  return app;
}
