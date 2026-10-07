import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { csrfMw } from "../src/middleware/csrf.js";

function app() {
  const a = new Hono();
  a.use(csrfMw());
  a.get("/x", (c) => c.json({ ok: true }));
  a.post("/x", (c) => c.json({ ok: true }));
  return a;
}

describe("csrfMw", () => {
  it("mutasi tanpa token -> 403 CSRF_TOKEN", async () => {
    const r = await app().request("/x", { method: "POST" });
    assert.equal(r.status, 403);
    assert.equal(((await r.json()) as { code: string }).code, "CSRF_TOKEN");
  });
  it("origin asing -> 403 CSRF_ORIGIN", async () => {
    const r = await app().request("/x", { method: "POST", headers: { origin: "https://evil.test", "x-csrf-token": "a", cookie: "csrf_token=a" } });
    assert.equal(r.status, 403);
    assert.equal(((await r.json()) as { code: string }).code, "CSRF_ORIGIN");
  });
  it("token cocok (cookie==header) + origin sah -> lolos", async () => {
    const r = await app().request("/x", { method: "POST", headers: { origin: "http://localhost:5173", "x-csrf-token": "tok123", cookie: "csrf_token=tok123" } });
    assert.equal(r.status, 200);
  });
  it("token cookie != header -> 403", async () => {
    const r = await app().request("/x", { method: "POST", headers: { "x-csrf-token": "a", cookie: "csrf_token=b" } });
    assert.equal(r.status, 403);
  });
  it("GET bebas token -> 200", async () => {
    assert.equal((await app().request("/x")).status, 200);
  });
  it("FRONTEND_ORIGIN koma: origin kedua & pertama lolos, asing tetap 403", async () => {
    const prev = process.env.FRONTEND_ORIGIN;
    process.env.FRONTEND_ORIGIN = "https://satu.test,http://localhost:5173";
    try {
      const ok2 = await app().request("/x", { method: "POST", headers: { origin: "http://localhost:5173", "x-csrf-token": "t", cookie: "csrf_token=t" } });
      assert.equal(ok2.status, 200);
      const ok1 = await app().request("/x", { method: "POST", headers: { origin: "https://satu.test", "x-csrf-token": "t", cookie: "csrf_token=t" } });
      assert.equal(ok1.status, 200);
      const bad = await app().request("/x", { method: "POST", headers: { origin: "https://evil.test", "x-csrf-token": "t", cookie: "csrf_token=t" } });
      assert.equal(bad.status, 403);
    } finally {
      if (prev === undefined) delete process.env.FRONTEND_ORIGIN; else process.env.FRONTEND_ORIGIN = prev;
    }
  });
});
