import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { CartItem, DeliveryMethod, Order, OrderMode, OrderStatus } from "../types.js";

function dayKey(now: Date): string {
  return `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

// Order-id harian via tabel order_seq: INSERT ... ON CONFLICT DO UPDATE bump atomik,
// aman lintas proses/replica (menggantikan counter in-memory).
export async function nextOrderId(pool: Pool, now: Date = new Date()): Promise<string> {
  const key = dayKey(now);
  const dayDate = `20${key.slice(0, 2)}-${key.slice(2, 4)}-${key.slice(4, 6)}`;
  const { rows } = await pool.query<{ n: number }>(
    "INSERT INTO order_seq (day, n) VALUES ($1, 1) ON CONFLICT (day) DO UPDATE SET n = order_seq.n + 1 RETURNING n",
    [dayDate],
  );
  const n = rows[0]?.n ?? 1;
  return `HP-${key}-${String(n).padStart(4, "0")}`;
}

// Validasi murni (tanpa I/O) — tetap sinkron.
export function deliveryError(method: DeliveryMethod, address: string | null | undefined): string | null {
  if (method === "delivery") {
    return address == null || address.length > 500 || address.trim().length < 10
      ? "Alamat pengiriman minimal 10 karakter, maksimal 500"
      : null;
  }
  return address != null ? "Alamat harus null untuk ambil sendiri" : null;
}

export async function createOrder(
  pool: Pool,
  items: Array<{ product_id: string; quantity: number }>,
  mode: OrderMode,
  scheduled_at: string | null,
  total: number,
  delivery_method: DeliveryMethod = "pickup",
  delivery_address: string | null = null,
): Promise<Order> {
  const orderId = await nextOrderId(pool);
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO orders (id, mode, scheduled_at, total_amount, status, delivery_method, delivery_address) VALUES ($1, $2, $3, $4, 'pending_payment', $5, $6)",
      [orderId, mode, scheduled_at, total, delivery_method, delivery_address],
    );
    const orderItems: CartItem[] = [];
    for (const i of items) {
      const itemId = randomUUID();
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, note, price_at_order) VALUES ($1, $2, $3, NULL, 0)",
        [orderId, i.product_id, i.quantity],
      );
      orderItems.push({ item_id: itemId, product_id: i.product_id, quantity: i.quantity, note: null });
    }
    await client.query("COMMIT");
    return { order_id: orderId, items: orderItems, mode, scheduled_at, total_amount: total, status: "pending_payment", delivery_method, delivery_address };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

type OrderRow = { id: string; mode: OrderMode; scheduled_at: Date | null; total_amount: number; status: OrderStatus; delivery_method: DeliveryMethod; delivery_address: string | null };
type ItemRow = { product_id: string; quantity: number; note: string | null };

export async function getOrder(pool: Pool, id: string): Promise<Order | null> {
  const { rows } = await pool.query<OrderRow>(
    "SELECT id, mode, scheduled_at, total_amount, status, delivery_method, delivery_address FROM orders WHERE id = $1",
    [id],
  );
  const o = rows[0];
  if (o === undefined) return null;
  const items = await pool.query<ItemRow>("SELECT product_id, quantity, note FROM order_items WHERE order_id = $1", [id]);
  return {
    order_id: o.id,
    items: items.rows.map((r) => ({ item_id: randomUUID(), product_id: r.product_id, quantity: r.quantity, note: r.note })),
    mode: o.mode,
    scheduled_at: o.scheduled_at === null ? null : o.scheduled_at.toISOString(),
    total_amount: o.total_amount,
    status: o.status,
    delivery_method: o.delivery_method,
    delivery_address: o.delivery_address,
  };
}

export async function setStatus(pool: Pool, id: string, status: OrderStatus): Promise<Order | null> {
  // Hanya transisi dari pending_payment yang diterima (idempotent-safe).
  await pool.query("UPDATE orders SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'pending_payment'", [id, status]);
  return getOrder(pool, id);
}
