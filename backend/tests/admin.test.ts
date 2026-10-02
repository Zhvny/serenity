import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { scryptSync, randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { getRedis, closeRedis } from "../src/db/redis.js";
import { assertAdminConfig } from "../src/services/adminAuth.js";

const SALT = "testsalt12345678";
const PASS = "benar123";
const pool = createPool();
// XFF unik per panggilan (bukan per file): tiap request dapat bucket rate-limit sendiri
// agar test tak saling menghabiskan kuota POST saat Redis limiter aktif.
function csrf(): Record<string, string> {
  return { "content-type": "application/json", origin: "http://localhost:5173", "x-csrf-token": "t1", cookie: "csrf_token=t1", "x-forwarded-for": `admin-ip-${randomUUID()}` };
}

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
    const res = await createApp(pool).request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: u, password: "salah" }) });
    assert.equal(res.status, 401);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_CREDS");
  });

  it("password salah 5x -> 429 LOCKED", async () => {
    const u = loginUser("brute"); createdUsers.push(u);
    const app = createApp(pool);
    let last = 0;
    for (let i = 0; i < 6; i++) {
      const r = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: u, password: "salah" }) });
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
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: "admin", password: PASS }) });
    assert.equal(login.status, 200);
    const sc = login.headers.get("set-cookie") ?? "";
    assert.match(sc, /admin_session=/);
    const sid = sc.match(/admin_session=([^;]+)/)?.[1] ?? "";
    const list = await app.request("/api/v1/admin/products", { headers: { cookie: `admin_session=${sid}` } });
    assert.equal(list.status, 200);
  });

  it("mark-paid idempoten: changed true lalu false; status paid; satu audit", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    const code = `ORD-MP${Date.now()}`;
    const orderId = `HP-MP-${Date.now()}`;
    createdOrders.push(orderId);
    await pool.query("INSERT INTO orders (id, mode, total_amount, status, delivery_method, session_id, unique_code) VALUES ($1,'instant',1000,'pending_payment','pickup','mp-sess',$2)", [orderId, code]);
    const h = { ...csrf(), cookie: `admin_session=${sid}; csrf_token=t1` };
    const first = await app.request(`/api/v1/admin/orders/${code}/mark-paid`, { method: "POST", headers: h, body: JSON.stringify({ paid_amount: 1000 }) });
    assert.equal(first.status, 200);
    assert.equal(((await first.json()) as { data: { changed: boolean } }).data.changed, true);
    const second = await app.request(`/api/v1/admin/orders/${code}/mark-paid`, { method: "POST", headers: h, body: JSON.stringify({ paid_amount: 1000 }) });
    assert.equal(((await second.json()) as { data: { changed: boolean } }).data.changed, false);
    const st = await pool.query<{ status: string }>("SELECT status FROM orders WHERE unique_code = $1", [code]);
    assert.equal(st.rows[0]?.status, "paid");
    const audit = await pool.query<{ n: string }>("SELECT count(*)::int AS n FROM audit_logs WHERE action = 'mark_paid' AND detail::text LIKE $1", [`%${code}%`]);
    assert.equal(Number(audit.rows[0]?.n), 1);
    await pool.query("DELETE FROM audit_logs WHERE action='mark_paid' AND detail::text LIKE $1", [`%${code}%`]);
  });

  it("mark-paid kode tak dikenal -> 404", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    const h = { ...csrf(), cookie: `admin_session=${sid}; csrf_token=t1` };
    const res = await app.request("/api/v1/admin/orders/ORD-TIDAKADA/mark-paid", { method: "POST", headers: h, body: JSON.stringify({ paid_amount: 1000 }) });
    assert.equal(res.status, 404);
  });

  it("mark-paid paid_amount=0 -> 400 VALIDATION_ERROR", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    const h = { ...csrf(), cookie: `admin_session=${sid}; csrf_token=t1` };
    const res = await app.request("/api/v1/admin/orders/ORD-X/mark-paid", { method: "POST", headers: h, body: JSON.stringify({ paid_amount: 0 }) });
    assert.equal(res.status, 400);
  });

  it("mark-paid kurang -> underpaid; settle-parent butuh anak lunas", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    const h = { ...csrf(), cookie: `admin_session=${sid}; csrf_token=t1` };
    const code = `ORD-SP${Date.now()}`;
    const orderId = `HP-SP-${Date.now()}`;
    const childId = `HP-SPC-${Date.now()}`;
    const childCode = `ORD-SPC${Date.now()}`;
    createdOrders.push(orderId, childId);
    await pool.query("INSERT INTO orders (id, mode, total_amount, status, delivery_method, session_id, unique_code) VALUES ($1,'instant',50000,'pending_payment','pickup','sp-sess',$2)", [orderId, code]);
    const mp = await app.request(`/api/v1/admin/orders/${code}/mark-paid`, { method: "POST", headers: h, body: JSON.stringify({ paid_amount: 30000 }) });
    assert.equal(mp.status, 200);
    assert.equal(((await mp.json()) as { data: { status: string } }).data.status, "underpaid");
    // Anak belum lunas -> settle ditolak.
    await pool.query("INSERT INTO orders (id, mode, total_amount, paid_amount, status, delivery_method, session_id, unique_code, parent_code) VALUES ($1,'instant',20000,NULL,'pending_payment','pickup','sp-sess',$2,$3)", [childId, childCode, code]);
    const early = await app.request(`/api/v1/admin/orders/${code}/settle-parent`, { method: "POST", headers: h });
    assert.equal(early.status, 409);
    // Lunaskan anak -> settle lolos.
    await pool.query("UPDATE orders SET status='paid', paid_amount=20000 WHERE unique_code=$1", [childCode]);
    const done = await app.request(`/api/v1/admin/orders/${code}/settle-parent`, { method: "POST", headers: h });
    assert.equal(done.status, 200);
    const st = await pool.query<{ status: string }>("SELECT status FROM orders WHERE unique_code = $1", [code]);
    assert.equal(st.rows[0]?.status, "paid");
    await pool.query("DELETE FROM audit_logs WHERE detail::text LIKE $1", [`%${code}%`]);
    await pool.query("DELETE FROM audit_logs WHERE detail::text LIKE $1", [`%${childCode}%`]);
    await pool.query("DELETE FROM orders WHERE id = $1", [childId]);
  });

  it("GET /admin/orders?status=underpaid|preparing|ready|done -> 200 (bukan 400)", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    for (const s of ["underpaid", "preparing", "ready", "done"]) {
      const res = await app.request(`/api/v1/admin/orders?status=${s}`, { headers: { cookie: `admin_session=${sid}` } });
      assert.equal(res.status, 200, `status=${s} harus 200`);
    }
  });

  it("PUT /admin/products/:id tanpa session -> 401 UNAUTH", async () => {
    const res = await createApp(pool).request("/api/v1/admin/products/prod_001", { method: "PUT", headers: csrf(), body: JSON.stringify({ name: "X", category_id: "cat_food", price: 1000 }) });
    assert.equal(res.status, 401);
    assert.equal(((await res.json()) as { code: string }).code, "UNAUTH");
  });

  it("PUT /admin/products/:id -> 200 + field berubah di DB + audit update_product", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    const pid = `prod-edit-${Date.now()}`;
    createdProducts.push(pid);
    await pool.query("INSERT INTO products (id, name, category_id, price, tags) VALUES ($1,'Lama','cat_food',10000,'{}')", [pid]);
    const h = { ...csrf(), cookie: `admin_session=${sid}; csrf_token=t1` };
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
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: "admin", password: PASS }) });
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

  it("GET /admin/orders/:code -> detail dgn item + alamat (delivery)", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    const code = `ORD-DET-${Date.now()}`;
    const id = `HP-DET-${Date.now()}`;
    createdOrders.push(id);
    await pool.query("INSERT INTO orders (id, mode, total_amount, status, delivery_method, delivery_address, session_id, unique_code) VALUES ($1,'instant',45000,'paid','delivery','Jl. Detail No.3','det-sess',$2)", [id, code]);
    await pool.query("INSERT INTO order_items (order_id, product_id, quantity, note, price_at_order) VALUES ($1,'prod_001',2,'tanpa gula',22500)", [id]);
    const res = await app.request(`/api/v1/admin/orders/${code}`, { headers: { cookie: `admin_session=${sid}` } });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { data: { unique_code: string; delivery_address: string | null; items: Array<{ product_id: string; quantity: number; name: string }> } };
    assert.equal(body.data.unique_code, code);
    assert.equal(body.data.delivery_address, "Jl. Detail No.3");
    assert.equal(body.data.items.length, 1);
    assert.equal(body.data.items[0]?.quantity, 2);
    assert.ok(typeof body.data.items[0]?.name === "string");
  });

  it("GET /admin/orders/:code underpaid -> detail ada paid_amount + parent_code", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    const code = `ORD-DPU-${Date.now()}`;
    const id = `HP-DPU-${Date.now()}`;
    createdOrders.push(id);
    await pool.query("INSERT INTO orders (id, mode, total_amount, paid_amount, status, delivery_method, session_id, unique_code) VALUES ($1,'instant',50000,30000,'underpaid','pickup','dpu-sess',$2)", [id, code]);
    const res = await app.request(`/api/v1/admin/orders/${code}`, { headers: { cookie: `admin_session=${sid}` } });
    assert.equal(res.status, 200);
    const data = ((await res.json()) as { data: Record<string, unknown> }).data;
    assert.equal(data["paid_amount"], 30000);
    assert.ok("parent_code" in data);
  });

  it("GET /admin/orders/:code tanpa session -> 401", async () => {
    const res = await createApp(pool).request("/api/v1/admin/orders/ORD-X");
    assert.equal(res.status, 401);
  });

  it("POST /admin/orders/:code/advance -> paid->preparing->ready->done; tolak lanjut setelah done", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    const code = `ORD-ADV-${Date.now()}`;
    const id = `HP-ADV-${Date.now()}`;
    createdOrders.push(id);
    await pool.query("INSERT INTO orders (id, mode, total_amount, status, delivery_method, session_id, unique_code) VALUES ($1,'instant',1000,'paid','pickup','adv-sess',$2)", [id, code]);
    const h = { ...csrf(), "x-forwarded-for": `adv-${randomUUID()}`, cookie: `admin_session=${sid}; csrf_token=t1` };
    const seq = ["preparing", "ready", "done"];
    for (const expected of seq) {
      const r = await app.request(`/api/v1/admin/orders/${code}/advance`, { method: "POST", headers: h, body: "{}" });
      assert.equal(r.status, 200);
      assert.equal(((await r.json()) as { data: { status: string } }).data.status, expected);
    }
    // Sudah done -> advance lagi ditolak 409.
    const over = await app.request(`/api/v1/admin/orders/${code}/advance`, { method: "POST", headers: h, body: "{}" });
    assert.equal(over.status, 409);
    const dbStatus = (await pool.query<{ status: string }>("SELECT status FROM orders WHERE unique_code=$1", [code])).rows[0]?.status;
    assert.equal(dbStatus, "done");
    // Audit: tiga transisi tercatat.
    const n = (await pool.query<{ n: string }>("SELECT count(*)::int AS n FROM audit_logs WHERE action='advance_order' AND detail::text LIKE $1", [`%${code}%`])).rows[0]?.n;
    assert.equal(Number(n), 3);
    await pool.query("DELETE FROM audit_logs WHERE action='advance_order' AND detail::text LIKE $1", [`%${code}%`]);
  });

  it("POST /admin/orders/:code/advance pada pending_payment -> 409 (belum lunas)", async () => {
    const app = createApp(pool);
    const login = await app.request("/api/v1/admin/login", { method: "POST", headers: csrf(), body: JSON.stringify({ username: "admin", password: PASS }) });
    const sid = (login.headers.get("set-cookie") ?? "").match(/admin_session=([^;]+)/)?.[1] ?? "";
    const code = `ORD-ADVP-${Date.now()}`;
    const id = `HP-ADVP-${Date.now()}`;
    createdOrders.push(id);
    await pool.query("INSERT INTO orders (id, mode, total_amount, status, delivery_method, session_id, unique_code) VALUES ($1,'instant',1000,'pending_payment','pickup','advp-sess',$2)", [id, code]);
    const h = { ...csrf(), "x-forwarded-for": `advp-${randomUUID()}`, cookie: `admin_session=${sid}; csrf_token=t1` };
    const r = await app.request(`/api/v1/admin/orders/${code}/advance`, { method: "POST", headers: h, body: "{}" });
    assert.equal(r.status, 409);
    assert.equal(((await r.json()) as { code: string }).code, "INVALID_TRANSITION");
  });
});
