import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db/pool.js";
import { closeRedis } from "../src/db/redis.js";

// DB-backed (serenity): cart dipersistensi; test memakai Postgres riil.
// Butuh seed samp_001. Bersihkan baris cart yang dibuat test di akhir.
const pool = createPool();
const XFF = `cart-ip-${randomUUID()}`; // IP unik -> bucket rate-limit terisolasi
const createdCarts: string[] = [];

function cookieOf(res: Response): string {
  const sc = res.headers.get("set-cookie") ?? "";
  const id = sc.match(/cart_id=([^;]+)/)?.[1];
  if (id !== undefined) createdCarts.push(id);
  return sc;
}

after(async () => {
  for (const id of createdCarts) {
    await pool.query("DELETE FROM cart_items WHERE cart_id = $1", [id]);
    await pool.query("DELETE FROM carts WHERE id = $1", [id]);
  }
  await pool.end();
  await closeRedis();
});

describe("cart", () => {
  it("POST /cart/add qty 0 → 400", async () => {
    const res = await createApp(pool).request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": XFF }, body: JSON.stringify({ product_id: "samp_001", quantity: 0 }) });
    assert.equal(res.status, 400);
  });
  it("POST /cart/add valid → 200 + Set-Cookie cart_id", async () => {
    const res = await createApp(pool).request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "samp_001", quantity: 2 }) });
    assert.equal(res.status, 200);
    assert.match(cookieOf(res), /cart_id=/);
  });
  it("PUT /cart/items/:id qty 0 → 400", async () => {
    const app = createApp(pool);
    const add = await app.request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "samp_001", quantity: 1 }) });
    const cookie = cookieOf(add);
    const { data } = (await add.json()) as { data: { item_id: string } };
    const res = await app.request(`/api/v1/cart/items/${data.item_id}`, { method: "PUT", headers: { "content-type": "application/json", cookie, "x-forwarded-for": XFF }, body: JSON.stringify({ quantity: 0 }) });
    assert.equal(res.status, 400);
  });
  it("POST /cart/add qty 11 → 400", async () => {
    const res = await createApp(pool).request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "samp_001", quantity: 11 }) });
    assert.equal(res.status, 400);
  });
  it("POST /cart/add qty -1 → 400", async () => {
    const res = await createApp(pool).request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "samp_001", quantity: -1 }) });
    assert.equal(res.status, 400);
  });
  it("POST /cart/add tanpa product_id → 400 VALIDATION_ERROR", async () => {
    const res = await createApp(pool).request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quantity: 1 }) });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "VALIDATION_ERROR");
  });
  it("POST /cart/add produk unknown → 404 PRODUCT_NOT_FOUND", async () => {
    const res = await createApp(pool).request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "prod_nope", quantity: 1 }) });
    assert.equal(res.status, 404);
    assert.equal(((await res.json()) as { code: string }).code, "PRODUCT_NOT_FOUND");
  });
  it("PUT /cart/items/:id update note → 200", async () => {
    const app = createApp(pool);
    const add = await app.request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "samp_001", quantity: 1 }) });
    const cookie = cookieOf(add);
    const { data } = (await add.json()) as { data: { item_id: string } };
    const res = await app.request(`/api/v1/cart/items/${data.item_id}`, { method: "PUT", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ quantity: 2, note: "tanpa es" }) });
    assert.equal(res.status, 200);
    const updated = (await res.json()) as { data: { quantity: number; note: string | null } };
    assert.equal(updated.data.quantity, 2);
    assert.equal(updated.data.note, "tanpa es");
  });
  it("POST /cart/add produk sama 2x → 1 baris, qty dijumlah (bukan baris baru)", async () => {
    const app = createApp(pool);
    const a1 = await app.request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "samp_001", quantity: 2 }) });
    const cookie = cookieOf(a1);
    const first = (await a1.json()) as { data: { item_id: string } };
    const a2 = await app.request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ product_id: "samp_001", quantity: 3 }) });
    const second = (await a2.json()) as { data: { item_id: string; quantity: number } };
    assert.equal(second.data.item_id, first.data.item_id, "harus item yang sama (merge), bukan item baru");
    assert.equal(second.data.quantity, 5, "qty harus dijumlah 2+3");
    const cart = await app.request("/api/v1/cart", { headers: { cookie, "x-forwarded-for": XFF } });
    const items = ((await cart.json()) as { data: Array<{ product_id: string }> }).data.filter((i) => i.product_id === "samp_001");
    assert.equal(items.length, 1, "hanya 1 baris untuk produk sama");
  });
  it("POST /cart/add produk sama melebihi 10 → qty di-clamp ke 10", async () => {
    const app = createApp(pool);
    const a1 = await app.request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product_id: "samp_001", quantity: 7 }) });
    const cookie = cookieOf(a1);
    const a2 = await app.request("/api/v1/cart/add", { method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify({ product_id: "samp_001", quantity: 8 }) });
    const second = (await a2.json()) as { data: { quantity: number } };
    assert.equal(second.data.quantity, 10, "7+8 di-clamp ke maksimum 10");
  });
  it("POST /cart/checkout instant+scheduled_at → 400", async () => {
    const res = await createApp(pool).request("/api/v1/cart/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "instant", scheduled_at: new Date(Date.now() + 3600000).toISOString() }) });
    assert.equal(res.status, 400);
  });
  it("POST /cart/checkout delivery tanpa address → 400 INVALID_ADDRESS", async () => {
    const res = await createApp(pool).request("/api/v1/cart/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "instant", delivery_method: "delivery" }) });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("POST /cart/checkout pickup + address → 400 INVALID_ADDRESS", async () => {
    const res = await createApp(pool).request("/api/v1/cart/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "instant", delivery_method: "pickup", delivery_address: "Jl. Sehat No. 10" }) });
    assert.equal(res.status, 400);
    assert.equal(((await res.json()) as { code: string }).code, "INVALID_ADDRESS");
  });
  it("POST /cart/checkout delivery + address → 200 + echo", async () => {
    const res = await createApp(pool).request("/api/v1/cart/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "instant", delivery_method: "delivery", delivery_address: "Jl. Sehat No. 10 Jakarta" }) });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { data: { delivery_method: string; delivery_address: string } };
    assert.equal(json.data.delivery_method, "delivery");
    assert.equal(json.data.delivery_address, "Jl. Sehat No. 10 Jakarta");
  });
});
