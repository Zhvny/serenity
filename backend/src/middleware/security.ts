import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { getRedis } from "../db/redis.js";

export function corsMw(): MiddlewareHandler {
  return cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173", credentials: true });
}

export function loggerMw(): MiddlewareHandler {
  return logger();
}

// Header keamanan dasar (CSP/HSTS/anti-clickjacking/nosniff/referrer). Mount global.
export function securityHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    c.header("Content-Security-Policy", "default-src 'self'");
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    c.header("X-Frame-Options", "DENY");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "no-referrer");
  };
}

const WINDOW_SEC = 60;
const LIMITS: Record<string, number> = { GET: 60, POST: 20, PUT: 10, DELETE: 10 };

function clientIp(xff: string | undefined): string {
  // ponytail: pakai first-hop x-forwarded-for untuk dev; di prod (Azure Container Apps)
  // ganti ke IP koneksi tepercaya agar header tak bisa dipalsukan untuk bypass limit.
  if (xff === undefined || xff === "") return "local";
  const first = xff.split(",")[0];
  return first.trim();
}

// Rate-limit per IP per tier method (storage Redis bersama agar konsisten lintas replica).
// INCR+EXPIRE atomic via pipeline; fail-open bila Redis unreachable (log mask di app.onError).
export function tieredRateLimit(): MiddlewareHandler {
  return async (c, next) => {
    const method = c.req.method;
    const limit = LIMITS[method];
    if (limit === undefined) return next();
    const ip = clientIp(c.req.header("x-forwarded-for"));
    const key = `rl:${method}:${ip}`;
    let count: number;
    try {
      const r = getRedis();
      // lazyConnect + enableOfflineQueue: perintah pertama memicu connect & di-antre;
      // tak perlu r.connect() manual (menghindari balapan "already connecting").
      const res = await r.multi().incr(key).expire(key, WINDOW_SEC, "NX").exec();
      const incr = res?.[0]?.[1];
      count = typeof incr === "number" ? incr : Number(incr);
    } catch {
      return next();
    }
    if (count > limit) {
      return c.json({ status: "error", code: "RATE_LIMITED", message: "Terlalu banyak permintaan" }, 429);
    }
    return next();
  };
}
