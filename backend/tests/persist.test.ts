import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createPool } from "../src/db/pool.js";
import { addItem, getCart } from "../src/services/cart.js";
import { getOrder, nextOrderId } from "../src/services/orders.js";

const pool = createPool();
const cartId = `cart-test-${randomUUID()}`;

before(async () => {
  await pool.query("INSERT INTO carts (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [cartId]);
});
after(async () => {
  await pool.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);
  await pool.query("DELETE FROM carts WHERE id = $1", [cartId]);
  await pool.end();
});

describe("persistensi cart", () => {
  it("addItem lalu getCart (panggilan baru) → item tetap ada di DB", async () => {
    const added = await addItem(pool, cartId, "samp_001", 2, "tanpa es");
    assert.equal(added.product_id, "samp_001");
    const items = await getCart(pool, cartId);
    const found = items.find((i) => i.item_id === added.item_id);
    assert.ok(found, "item tidak ditemukan setelah re-read DB");
    assert.equal(found?.quantity, 2);
    assert.equal(found?.note, "tanpa es");
  });
  it("10x addItem paralel produk sama → qty penuh tanpa lost update", async () => {
    const cid = `cart-race-${randomUUID()}`;
    await pool.query("INSERT INTO carts (id) VALUES ($1)", [cid]);
    try {
      await addItem(pool, cid, "samp_001", 1, null);
      await Promise.all(Array.from({ length: 9 }, () => addItem(pool, cid, "samp_001", 1, null)));
      const items = await getCart(pool, cid);
      assert.equal(items.length, 1);
      assert.equal(items[0]?.quantity, 10);
    } finally {
      await pool.query("DELETE FROM cart_items WHERE cart_id = $1", [cid]);
      await pool.query("DELETE FROM carts WHERE id = $1", [cid]);
    }
  });
});

describe("persistensi order + order-id sequence", () => {
  it("nextOrderId berformat HP-YYMMDD-NNNN dan menaik", async () => {
    const a = await nextOrderId(pool);
    const b = await nextOrderId(pool);
    assert.match(a, /^HP-\d{6}-\d{4}$/);
    const na = Number(a.slice(-4));
    const nb = Number(b.slice(-4));
    assert.equal(nb, na + 1);
  });
  it("seed SQL lalu getOrder (panggilan baru) → order tetap ada", async () => {
    const id = `HP-RR-${Date.now()}`;
    await pool.query("INSERT INTO orders (id, mode, total_amount, status, delivery_method, session_id, unique_code) VALUES ($1,'instant',45000,'pending_payment','pickup','rr-sess',$2)", [id, `ORD-RR-${Date.now()}`]);
    await pool.query("INSERT INTO order_items (order_id, product_id, quantity, note, price_at_order) VALUES ($1,'samp_001',1,NULL,45000)", [id]);
    const again = await getOrder(pool, id);
    assert.ok(again, "order tidak ditemukan setelah re-read DB");
    assert.equal(again?.order_id, id);
    assert.equal(again?.total_amount, 45000);
    await pool.query("DELETE FROM order_items WHERE order_id = $1", [id]);
    await pool.query("DELETE FROM orders WHERE id = $1", [id]);
  });
});
