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
const createdOrders: string[] = [];
const createdProducts: string[] = [];

before(() => {
  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASS_HASH = `${SALT}:${scryptSync(PASS, SALT, 64).toString("hex")}`;
});
after(async () => {
  for (const u of createdUsers) await pool.query("DELETE FROM login_attempts WHERE username = $1", [u]);
  for (const id of createdOrders) await pool.query("DELETE FROM orders WHERE id = $1", [id]);
  for (const id of createdProducts) await pool.query("DELETE FROM products WHERE id = $1", [id]);
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

  it("mark-paid idempoten: changed true lalu false; status paid; satu audit", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrfHeaders, body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    const code = `ORD-MP${Date.now()}`;
    const orderId = `HP-MP-${Date.now()}`;
    createdOrders.push(orderId);
    await pool.query("INSERT INTO orders (id, mode, total_amount, status, delivery_method, session_id, unique_code) VALUES ($1,'instant',1000,'pending_payment','pickup','mp-sess',$2)", [orderId, code]);
    const h = { ...csrfHeaders, cookie: `admin_session=${sid}; csrf_token=t1` };
    const first = await app.request(`/api/v1/admin/orders/${code}/mark-paid`, { method: "POST", headers: h, body: "{}" });
    assert.equal(first.status, 200);
    assert.equal(((await first.json()) as { data: { changed: boolean } }).data.changed, true);
    const second = await app.request(`/api/v1/admin/orders/${code}/mark-paid`, { method: "POST", headers: h, body: "{}" });
    assert.equal(((await second.json()) as { data: { changed: boolean } }).data.changed, false);
    const st = await pool.query<{ status: string }>("SELECT status FROM orders WHERE unique_code = $1", [code]);
    assert.equal(st.rows[0]?.status, "paid");
    const audit = await pool.query<{ n: string }>("SELECT count(*)::int AS n FROM audit_logs WHERE action = 'mark_paid' AND detail::text LIKE $1", [`%${code}%`]);
    assert.equal(Number(audit.rows[0]?.n), 1);
    await pool.query("DELETE FROM audit_logs WHERE action='mark_paid' AND detail::text LIKE $1", [`%${code}%`]);
  });

  it("PUT /admin/products/:id tanpa session -> 401 UNAUTH", async () => {
    const res = await createApp(pool).request("/api/v1/admin/products/prod_001", { method: "PUT", headers: csrfHeaders, body: JSON.stringify({ name: "X", category_id: "cat_food", price: 1000 }) });
    assert.equal(res.status, 401);
    assert.equal(((await res.json()) as { code: string }).code, "UNAUTH");
  });

  it("PUT /admin/products/:id -> 200 + field berubah di DB + audit update_product", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrfHeaders, body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    const pid = `prod-edit-${Date.now()}`;
    createdProducts.push(pid);
    await pool.query("INSERT INTO products (id, name, category_id, price, tags) VALUES ($1,'Lama','cat_food',10000,'{}')", [pid]);
    const h = { ...csrfHeaders, cookie: `admin_session=${sid}; csrf_token=t1` };
    const res = await app.request(`/api/v1/admin/products/${pid}`, { method: "PUT", headers: h, body: JSON.stringify({ name: "Baru Enak", category_id: "cat_dessert", price: 55000, tags: ["low-sugar"] }) });
    assert.equal(res.status, 200);
    const row = await pool.query<{ name: string; price: number; category_id: string }>("SELECT name, price, category_id FROM products WHERE id = $1", [pid]);
    assert.equal(row.rows[0]?.name, "Baru Enak");
    assert.equal(Number(row.rows[0]?.price), 55000);
    assert.equal(row.rows[0]?.category_id, "cat_dessert");
    const audit = await pool.query<{ n: string }>("SELECT count(*)::int AS n FROM audit_logs WHERE action='update_product' AND detail::text LIKE $1", [`%${pid}%`]);
    assert.equal(Number(audit.rows[0]?.n), 1);
    await pool.query("DELETE FROM audit_logs WHERE action='update_product' AND detail::text LIKE $1", [`%${pid}%`]);
  });

  it("GET /admin/orders tanpa session -> 401 UNAUTH", async () => {
    const res = await createApp(pool).request("/api/v1/admin/orders?status=pending_payment");
    assert.equal(res.status, 401);
    assert.equal(((await res.json()) as { code: string }).code, "UNAUTH");
  });

  it("GET /admin/orders?status=pending_payment -> hanya pending, TANPA delivery_address", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrfHeaders, body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    const codePend = `ORD-ADMINLIST-${Date.now()}`;
    const idPend = `HP-AL-${Date.now()}`;
    const idPaid = `HP-AL2-${Date.now()}`;
    createdOrders.push(idPend, idPaid);
    await pool.query("INSERT INTO orders (id, mode, total_amount, status, delivery_method, delivery_address, session_id, unique_code) VALUES ($1,'instant',77000,'pending_payment','delivery','Jl. RAHASIA No.9','al-sess',$2)", [idPend, codePend]);
    await pool.query("INSERT INTO orders (id, mode, total_amount, status, delivery_method, session_id, unique_code) VALUES ($1,'instant',5000,'paid','pickup','al-sess2',$2)", [idPaid, `ORD-PAID-${Date.now()}`]);
    const res = await app.request("/api/v1/admin/orders?status=pending_payment", { headers: { cookie: `admin_session=${sid}` } });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { data: Array<{ id: string; unique_code: string; status: string } & Record<string, unknown>> };
    const ids = body.data.map((o) => o.id);
    assert.ok(ids.includes(idPend), "order pending harus ada");
    assert.ok(!ids.includes(idPaid), "order paid tak boleh muncul");
    assert.ok(body.data.every((o) => o.status === "pending_payment"));
    assert.ok(body.data.every((o) => o["delivery_address"] === undefined), "delivery_address bocor di list");
    assert.doesNotMatch(JSON.stringify(body.data), /RAHASIA/);
  });
});
