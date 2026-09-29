import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const hits = new Map<string, { n: number; reset: number }>();

export function corsMw(): MiddlewareHandler {
  return cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173" });
}

export function loggerMw(): MiddlewareHandler {
  return logger();
}

export function paymentRateLimit(): MiddlewareHandler {
  return async (c, next) => {
    if (!c.req.path.startsWith("/api/v1/payment/")) return next();
    const ip = c.req.header("x-forwarded-for") ?? "local";
    const now = Date.now();
    const rec = hits.get(ip);
    if (rec === undefined || now > rec.reset) {
      hits.set(ip, { n: 1, reset: now + 60_000 });
      return next();
    }
    rec.n += 1;
    if (rec.n > 60) {
      return c.json({ status: "error", code: "RATE_LIMITED", message: "Terlalu banyak permintaan" }, 429);
    }
    return next();
  };
}
