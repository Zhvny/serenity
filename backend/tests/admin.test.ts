import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { getRedis, closeRedis } from "../src/db/redis.js";
import { assertAdminConfig } from "../src/services/adminAuth.js";

const SALT = "testsalt12345678";
const PASS = "benar123";
const pool = createPool();
// CSRF: double-submit cookie + Origin sah.
const csrfHeaders = { "content-type": "application/json", origin: "http://localhost:5173", "x-csrf-token": "t1", cookie: "csrf_token=t1" };

function loginUser(user: string): string { return `${user}-${Date.now()}`; }
const createdUsers: string[] = [];

before(() => {
  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASS_HASH = `${SALT}:${scryptSync(PASS, SALT, 64).toString("hex")}`;
});
after(async () => {
  for (const u of createdUsers) await pool.query("DELETE FROM login_attempts WHERE username = $1", [u]);
  await pool.query("DELETE FROM admin_sessions WHERE username = $1", ["admin"]);
  try {
    const r = getRedis();
    if (r.status === "wait" || r.status === "close" || r.status === "end") await r.connect();
    const keys = await r.keys("rl:*");
    if (keys.length > 0) await r.del(...keys);
  } catch { /* redis sudah tertutup */ }
  await pool.end();
  await closeRedis();
});

describe("assertAdminConfig (fail-fast)", () => {
  it("format salah -> throw", () => {
    const saved = process.env.ADMIN_PASS_HASH;
    process.env.ADMIN_PASS_HASH = "tanpa-pemisah";
    try { assert.throws(() => assertAdminConfig(), /ADMIN_USER \/ ADMIN_PASS_HASH/); }
    finally { process.env.ADMIN_PASS_HASH = saved; }
  });
  it("format benar -> tidak throw", () => {
    assert.doesNotThrow(() => assertAdminConfig());
  });
});

describe("admin login + guard (DB-backed, serenity)", () => {
  it("CSRF: login tanpa token -> 403", async () => {
    const res = await createApp(pool).request("/api/v1/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username: "admin", password: PASS }) });
    assert.equal(res.status, 403);
  });

  it("kredensial salah -> 401 INVALID_CREDS", async () => {
    const u = loginUser("admin"); createdUsers.push(u);
    const res = await createApp(pool).request("/api/v1/admin/login", { method: "POST", headers: csrfHeaders, body: JSON.stringify({ username: u, password: "salah" }) });
    assert.equal(res.status, 401);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_CREDS");
  });

  it("password salah 5x -> 429 LOCKED", async () => {
    const u = loginUser("brute"); createdUsers.push(u);
    const app = createApp(pool);
    let last = 0;
    for (let i = 0; i < 6; i++) {
      const r = await app.request("/api/v1/admin/login", { method: "POST", headers: csrfHeaders, body: JSON.stringify({ username: u, password: "salah" }) });
      last = r.status;
      if (last === 429) break;
    }
    assert.equal(last, 429);
  });

  it("GET /admin/products tanpa session -> 401 UNAUTH", async () => {
    const res = await createApp(pool).request("/api/v1/admin/products");
    assert.equal(res.status, 401);
    assert.equal(((await res.json()) as { code: string }).code, "UNAUTH");
  });

  it("login benar -> 200 + Set-Cookie admin_session; lalu GET products 200", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrfHeaders, body: JSON.stringify({ username: "admin", password: PASS }) });
    assert.equal(login.status, 200);
    const sc = login.headers.get("set-cookie") ?? "";
    assert.match(sc, /admin_session=/);
    const sid = sc.match(/admin_session=([^;]+)/)?.[1] ?? "";
    const list = await app.request("/api/v1/admin/products", { headers: { cookie: `admin_session=${sid}` } });
    assert.equal(list.status, 200);
  });
});
