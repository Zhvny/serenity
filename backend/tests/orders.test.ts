import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { closeRedis } from "../src/db/redis.js";
import { markPaid, listMine, expireStale } from "../src/services/orders.js";

// DB-backed (serenity): order dipersistensi; test memakai Postgres riil + seed prod_001.
const pool = createPool();
const XFF = `orders-ip-${randomUUID()}`; // IP unik -> bucket rate-limit terisolasi dari file lain
const future = new Date(Date.now() + 25 * 3600 * 1000).toISOString();
const createdOrders: string[] = [];

async function postOrder(body: unknown): Promise<Response> {
  const res = await createApp(pool).request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": XFF }, body: JSON.stringify(body) });
  return res;
}

after(async () => {
  for (const id of createdOrders) {
    await pool.query("DELETE FROM order_items WHERE order_id = $1", [id]);
    await pool.query("DELETE FROM orders WHERE id = $1", [id]);
  }
  await pool.end();
  await closeRedis();
});

describe("orders", () => {
  it("POST /orders scheduled <24 jam → 400 INVALID_SCHEDULE", async () => {
    const res = await postOrder({ items: [{ product_id: "prod_001", quantity: 1 }], mode: "scheduled", scheduled_at: new Date(Date.now() + 3600 * 1000).toISOString() });
    assert.equal(res.status, 400);
  });
  it("POST /orders instant + scheduled_at → 400 INVALID_SCHEDULE", async () => {
    const res = await postOrder({ items: [{ product_id: "prod_001", quantity: 1 }], mode: "instant", scheduled_at: future });
    assert.equal(res.status, 400);
  });
  it("PUT /orders/:id/status tanpa internal key → 403", async () => {
    const res = await createApp(pool).request("/api/v1/orders/HP-0001/status", { method: "PUT", headers: { "content-type": "application/json", "x-forwarded-for": XFF }, body: JSON.stringify({ status: "paid" }) });
    assert.equal(res.status, 403);
  });
  it("POST /orders qty 11 → 400 VALIDATION_ERROR", async () => {
    const res = await postOrder({ items: [{ product_id: "prod_001", quantity: 11 }], mode: "instant" });
    assert.equal(res.status, 400);
  });
});

describe("orders delivery", () => {
  const base = { items: [{ product_id: "prod_001", quantity: 1 }], mode: "instant" };

  it("delivery tanpa address → 400 INVALID_ADDRESS", async () => {
    const res = await postOrder({ ...base, delivery_method: "delivery" });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("delivery address <10 char → 400 INVALID_ADDRESS", async () => {
    const res = await postOrder({ ...base, delivery_method: "delivery", delivery_address: "jl a" });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("delivery address >500 char → 400 INVALID_ADDRESS", async () => {
    const res = await postOrder({ ...base, delivery_method: "delivery", delivery_address: "a".repeat(501) });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("pickup + address terisi → 400 INVALID_ADDRESS", async () => {
    const res = await postOrder({ ...base, delivery_method: "pickup", delivery_address: "Jl. Sehat No. 10 Jakarta" });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("delivery + address valid → 200 + echo field", async () => {
    const res = await postOrder({ ...base, delivery_method: "delivery", delivery_address: "Jl. Sehat No. 10 Jakarta" });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { data: { order_id: string; delivery_method: string; delivery_address: string } };
    createdOrders.push(json.data.order_id);
    assert.equal(json.data.delivery_method, "delivery");
    assert.equal(json.data.delivery_address, "Jl. Sehat No. 10 Jakarta");
  });
});

describe("orders mine + topup (sesi)", () => {
  const sess = `sess-mine-${randomUUID()}`;
  const jar = `cart_id=${sess}`;
  async function seedMine(total: number, paid: number | null, status: string, parent: string | null = null): Promise<{ id: string; code: string }> {
    const id = `M-${randomUUID().slice(0, 8)}`;
    const code = `ORD-${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 16)}`;
    await pool.query(
      "INSERT INTO orders (id, mode, total_amount, paid_amount, status, delivery_method, session_id, unique_code, parent_code) VALUES ($1, 'instant', $2, $3, $4, 'pickup', $5, $6, $7)",
      [id, total, paid, status, sess, code, parent],
    );
    createdOrders.push(id);
    return { id, code };
  }
  function req(path: string, method: string, cookie?: string, body?: unknown): Promise<Response> {
    return createApp(pool).request(`/api/v1${path}`, {
      method, headers: { "content-type": "application/json", "x-forwarded-for": XFF, ...(cookie === undefined ? {} : { cookie }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  it("GET /orders/mine tanpa cookie -> 404 seragam", async () => {
    const res = await req("/orders/mine", "GET");
    assert.equal(res.status, 404);
  });
  it("GET /orders/mine sesi lain -> 200 kosong (tak bocor)", async () => {
    await seedMine(10000, null, "pending_payment");
    const res = await req("/orders/mine", "GET", "cart_id=sess-asing");
    assert.equal(res.status, 200);
    assert.equal(((await res.json()) as { data: unknown[] }).data.length, 0);
  });
  it("GET /orders/mine -> hanya milik sesi", async () => {
    await seedMine(10000, null, "pending_payment");
    const res = await req("/orders/mine", "GET", jar);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { data: Array<{ unique_code: string } & Record<string, unknown>> };
    assert.ok(body.data.length >= 1);
    assert.ok(body.data.every((o) => o["delivery_address"] === undefined));
  });
  it("POST /:code/topup underpaid -> anak nominal sisa", async () => {
    const { code } = await seedMine(50000, 30000, "underpaid");
    const res = await req(`/orders/${code}/topup`, "POST", jar, {});
    assert.equal(res.status, 200);
    const body = (await res.json()) as { data: { unique_code: string; nominal: number } };
    assert.equal(body.data.nominal, 20000);
    assert.notEqual(body.data.unique_code, code);
    const row = await pool.query<{ parent_code: string | null }>("SELECT parent_code FROM orders WHERE unique_code = $1", [body.data.unique_code]);
    assert.equal(row.rows[0]?.parent_code, code);
    const childId = (await pool.query<{ id: string }>("SELECT id FROM orders WHERE unique_code = $1", [body.data.unique_code])).rows[0]?.id ?? "x";
    await pool.query("DELETE FROM orders WHERE id = $1", [childId]);
  });
  it("POST /:code/topup pada anak (level-2) -> 409", async () => {
    const { code } = await seedMine(50000, 30000, "underpaid");
    const first = await req(`/orders/${code}/topup`, "POST", jar, {});
    assert.equal(first.status, 200);
    const child = ((await first.json()) as { data: { unique_code: string } }).data.unique_code;
    const childRow = await pool.query<{ id: string }>("SELECT id FROM orders WHERE unique_code = $1", [child]);
    const second = await req(`/orders/${child}/topup`, "POST", jar, {});
    assert.equal(second.status, 409);
    assert.equal(((await second.json()) as { code: string }).code, "INVALID_TOPUP");
    await pool.query("DELETE FROM orders WHERE id = $1", [childRow.rows[0]?.id]);
  });
  it("topup me-refresh updated_at parent (lolos expire)", async () => {
    const { id, code } = await seedMine(50000, 30000, "underpaid");
    await pool.query("UPDATE orders SET updated_at = CURRENT_TIMESTAMP - INTERVAL '3 hours' WHERE id = $1", [id]);
    const res = await req(`/orders/${code}/topup`, "POST", jar, {});
    assert.equal(res.status, 200);
    const child = ((await res.json()) as { data: { unique_code: string } }).data.unique_code;
    const fresh = await pool.query<{ ok: boolean }>("SELECT updated_at > CURRENT_TIMESTAMP - INTERVAL '1 minute' AS ok FROM orders WHERE id = $1", [id]);
    assert.equal(fresh.rows[0]?.ok, true);
    const childRow = await pool.query<{ id: string }>("SELECT id FROM orders WHERE unique_code = $1", [child]);
    await pool.query("DELETE FROM orders WHERE id = $1", [childRow.rows[0]?.id]);
  });
  it("POST /:code/topup kedua (anak belum lunas) -> 409", async () => {
    const { code } = await seedMine(50000, 30000, "underpaid");
    const first = await req(`/orders/${code}/topup`, "POST", jar, {});
    assert.equal(first.status, 200);
    const child = ((await first.json()) as { data: { unique_code: string } }).data.unique_code;
    const childRow = await pool.query<{ id: string }>("SELECT id FROM orders WHERE unique_code = $1", [child]);
    const second = await req(`/orders/${code}/topup`, "POST", jar, {});
    assert.equal(second.status, 409);
    assert.equal(((await second.json()) as { code: string }).code, "INVALID_TOPUP");
    await pool.query("DELETE FROM orders WHERE id = $1", [childRow.rows[0]?.id]);
  });
  it("POST /:code/topup pada paid -> 409", async () => {
    const { code } = await seedMine(50000, 50000, "paid");
    const res = await req(`/orders/${code}/topup`, "POST", jar, {});
    assert.equal(res.status, 409);
  });
  it("POST /internal/expire tanpa kunci -> 403; dengan kunci -> 200", async () => {
    const deny = await req("/internal/expire", "POST", undefined, {});
    assert.equal(deny.status, 403);
    const saved = process.env.INTERNAL_KEY;
    process.env.INTERNAL_KEY = "kunci-test-expire";
    try {
      const ok = await createApp(pool).request("/api/v1/internal/expire", {
        method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": XFF, "x-internal-key": "kunci-test-expire" }, body: "{}",
      });
      assert.equal(ok.status, 200);
      assert.ok(typeof ((await ok.json()) as { data: { expired: number } }).data.expired === "number");
    } finally {
      if (saved === undefined) delete process.env.INTERNAL_KEY;
      else process.env.INTERNAL_KEY = saved;
    }
  });
});
describe("orders underpaid service", () => {
  const sess = `sess-${randomUUID()}`;
  async function seedOrder(total: number, status = "pending_payment"): Promise<{ id: string; code: string }> {
    const id = `T-${randomUUID().slice(0, 8)}`;
    const code = `ORD-${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 16)}`;
    await pool.query(
      "INSERT INTO orders (id, mode, total_amount, status, delivery_method, session_id, unique_code) VALUES ($1, 'instant', $2, $3, 'pickup', $4, $5)",
      [id, total, status, sess, code],
    );
    createdOrders.push(id);
    return { id, code };
  }

  it("markPaid kurang -> underpaid + paid_amount tercatat", async () => {
    const { code } = await seedOrder(50000);
    const o = await markPaid(pool, code, 30000);
    assert.equal(o?.status, "underpaid");
    assert.equal(o?.paid_amount, 30000);
  });
  it("markPaid pas -> paid", async () => {
    const { code } = await seedOrder(50000);
    const o = await markPaid(pool, code, 50000);
    assert.equal(o?.status, "paid");
    assert.equal(o?.paid_amount, 50000);
  });
  it("markPaid lebih -> paid", async () => {
    const { code } = await seedOrder(50000);
    const o = await markPaid(pool, code, 60000);
    assert.equal(o?.status, "paid");
    assert.equal(o?.paid_amount, 60000);
  });
  it("markPaid non-pending -> null", async () => {
    const { code } = await seedOrder(50000, "paid");
    assert.equal(await markPaid(pool, code, 50000), null);
  });
  it("markPaid konkuren -> tepat satu menang", async () => {
    const { code } = await seedOrder(50000);
    const [a, b] = await Promise.all([markPaid(pool, code, 30000), markPaid(pool, code, 50000)]);
    const won = [a, b].filter((o) => o !== null);
    assert.equal(won.length, 1);
  });
  it("listMine sertakan ringkas item (nama produk)", async () => {
    const { id } = await seedOrder(90000);
    await pool.query("INSERT INTO order_items (order_id, product_id, quantity, note, price_at_order) VALUES ($1, 'prod_001', 2, NULL, 45000)", [id]);
    const mine = await listMine(pool, sess);
    const found = mine.find((o) => o.order_id === id);
    assert.ok(found !== undefined);
    assert.equal(found.items.length, 1);
    assert.equal(found.items[0]?.quantity, 2);
    assert.ok(typeof found.items[0]?.name === "string" && found.items[0]?.name.length > 0);
  });
  it("listMine hanya milik sesi", async () => {
    await seedOrder(10000);
    const mine = await listMine(pool, sess);
    assert.ok(mine.length >= 1);
    const other = await listMine(pool, `sess-lain-${randomUUID()}`);
    assert.equal(other.length, 0);
  });
  it("expireStale: basi -> expired, fresh -> tetap", async () => {
    const old = await seedOrder(10000);
    await pool.query("UPDATE orders SET updated_at = CURRENT_TIMESTAMP - INTERVAL '3 hours' WHERE id = $1", [old.id]);
    const fresh = await seedOrder(10000);
    const n = await expireStale(pool, 2);
    assert.ok(n >= 1);
    const o = await pool.query<{ status: string }>("SELECT status FROM orders WHERE id = $1", [old.id]);
    assert.equal(o.rows[0]?.status, "expired");
    const f = await pool.query<{ status: string }>("SELECT status FROM orders WHERE id = $1", [fresh.id]);
    assert.equal(f.rows[0]?.status, "pending_payment");
  });
});
