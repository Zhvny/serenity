import { randomUUID } from "node:crypto";
import type { MiddlewareHandler } from "hono";

export const CSRF_COOKIE = "csrf_token";

// Proteksi CSRF untuk mutasi: Origin check + double-submit cookie (cookie == header).
// GET/HEAD/OPTIONS dibebaskan (tak mengubah state).
export function csrfMw(): MiddlewareHandler {
  return async (c, next) => {
    const method = c.req.method;
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
    const origin = c.req.header("origin");
    const allowed = (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173").split(",").map((s) => s.trim());
    if (origin !== undefined && !allowed.includes(origin)) {
      return c.json({ status: "error", code: "CSRF_ORIGIN", message: "Origin ditolak" }, 403);
    }
    const cookie = c.req.header("cookie")?.match(/csrf_token=([^;]+)/)?.[1];
    const header = c.req.header("x-csrf-token");
    if (cookie === undefined || header === undefined || cookie === "" || cookie !== header) {
      return c.json({ status: "error", code: "CSRF_TOKEN", message: "Token CSRF tidak valid" }, 403);
    }
    return next();
  };
}

export function issueCsrf(c: { header: (n: string, v: string) => void }): string {
  const token = randomUUID();
  c.header("Set-Cookie", `${CSRF_COOKIE}=${token}; SameSite=None; Secure; Path=/`);
  return token;
}
