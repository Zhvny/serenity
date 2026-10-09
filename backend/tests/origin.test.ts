import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { originMw } from "../src/middleware/csrf.js";

function app() {
  const a = new Hono();
  a.use(originMw());
  a.post("/x", (c) => c.json({ ok: true }));
  return a;
}

describe("originMw (mutasi publik)", () => {
  it("tanpa Origin (curl/server/test) -> lolos", async () => {
    assert.equal((await app().request("/x", { method: "POST" })).status, 200);
  });
  it("Origin sah -> lolos", async () => {
    const prev = process.env.FRONTEND_ORIGIN;
    process.env.FRONTEND_ORIGIN = "https://satu.test,http://localhost:5173";
    try {
      const r = await app().request("/x", { method: "POST", headers: { origin: "https://satu.test" } });
      assert.equal(r.status, 200);
    } finally {
      if (prev === undefined) delete process.env.FRONTEND_ORIGIN; else process.env.FRONTEND_ORIGIN = prev;
    }
  });
  it("Origin asing di POST -> 403 CSRF_ORIGIN", async () => {
    const r = await app().request("/x", { method: "POST", headers: { origin: "https://evil.test" } });
    assert.equal(r.status, 403);
    assert.equal(((await r.json()) as { code: string }).code, "CSRF_ORIGIN");
  });
  it("Origin asing di GET -> lolos (safe method)", async () => {
    const a = new Hono();
    a.use(originMw());
    a.get("/x", (c) => c.json({ ok: true }));
    const r = await a.request("/x", { headers: { origin: "https://evil.test" } });
    assert.equal(r.status, 200);
  });
});
