import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createPool } from "../src/db/pool.js";
import { addItem, getCart } from "../src/services/cart.js";
import { createOrder, getOrder, nextOrderId } from "../src/services/orders.js";

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
    const added = await addItem(pool, cartId, "prod_001", 2, "tanpa es");
    assert.equal(added.product_id, "prod_001");
    const items = await getCart(pool, cartId);
    const found = items.find((i) => i.item_id === added.item_id);
    assert.ok(found, "item tidak ditemukan setelah re-read DB");
    assert.equal(found?.quantity, 2);
    assert.equal(found?.note, "tanpa es");
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
  it("createOrder lalu getOrder (panggilan baru) → order tetap ada", async () => {
    const order = await createOrder(pool, [{ product_id: "prod_001", quantity: 1 }], "instant", null, 45000, "pickup", null);
    const again = await getOrder(pool, order.order_id);
    assert.ok(again, "order tidak ditemukan setelah re-read DB");
    assert.equal(again?.order_id, order.order_id);
    assert.equal(again?.total_amount, 45000);
    await pool.query("DELETE FROM order_items WHERE order_id = $1", [order.order_id]);
    await pool.query("DELETE FROM orders WHERE id = $1", [order.order_id]);
  });
});
