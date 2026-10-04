import { randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { CartItem, DeliveryMethod, Order, OrderMode, OrderStatus } from "../types.js";

export function newCode(): string {
  // 128-bit crypto-random, hex uppercase (dipindah dari routes/qris.ts agar dipakai topup).
  return `ORD-${randomBytes(16).toString("hex").toUpperCase()}`;
}

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
  sessionId: string | null = null,
): Promise<Order> {
  const orderId = await nextOrderId(pool);
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO orders (id, mode, scheduled_at, total_amount, status, delivery_method, delivery_address, session_id) VALUES ($1, $2, $3, $4, 'pending_payment', $5, $6, $7)",
      [orderId, mode, scheduled_at, total, delivery_method, delivery_address, sessionId],
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
    return { order_id: orderId, items: orderItems, mode, scheduled_at, total_amount: total, paid_amount: null, status: "pending_payment", delivery_method, delivery_address, parent_code: null, donation_consent: false };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

type OrderRow = { id: string; mode: OrderMode; scheduled_at: Date | null; total_amount: number; paid_amount: number | null; status: OrderStatus; delivery_method: DeliveryMethod; delivery_address: string | null; parent_code: string | null; donation_consent: boolean };
type ItemRow = { product_id: string; quantity: number; note: string | null };

export async function getOrder(pool: Pool, id: string): Promise<Order | null> {
  const { rows } = await pool.query<OrderRow>(
    "SELECT id, mode, scheduled_at, total_amount, paid_amount, status, delivery_method, delivery_address, parent_code, donation_consent FROM orders WHERE id = $1",
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
    paid_amount: o.paid_amount,
    status: o.status,
    delivery_method: o.delivery_method,
    delivery_address: o.delivery_address,
    parent_code: o.parent_code,
    donation_consent: o.donation_consent,
  };
}

// Mark-paid QRIS: catat nominal aktual; kurang -> underpaid, cukup/lebih -> paid.
// Hanya dari pending_payment (idempotent-safe); refresh updated_at agar jam expire reset.
export async function markPaid(pool: Pool, code: string, paidAmount: number): Promise<Order | null> {
  const cur = await pool.query<{ id: string; total_amount: number }>(
    "SELECT id, total_amount FROM orders WHERE unique_code = $1", [code]);
  const row = cur.rows[0];
  if (row === undefined) return null;
  const next = paidAmount >= row.total_amount ? "paid" : "underpaid";
  // Guard atomik: dua mark-paid konkuren -> tepat satu menang (pola sama dgn advance).
  const upd = await pool.query<{ id: string }>(
    "UPDATE orders SET status = $2, paid_amount = $3, updated_at = CURRENT_TIMESTAMP WHERE unique_code = $1 AND status = 'pending_payment' RETURNING id",
    [code, next, paidAmount]);
  const won = upd.rows[0];
  if (won === undefined) return null;
  return getOrder(pool, won.id);
}

// Histori milik sesi (tanpa PII alamat; item ringkas nama+qty untuk kartu histori).
export type MineItem = { product_id: string; name: string; name_en: string | null; quantity: number };
export async function listMine(pool: Pool, cartId: string, status?: string): Promise<Array<Omit<Order, "delivery_address" | "items"> & { items: MineItem[] }>> {
  const cols = "id, mode, scheduled_at, total_amount, paid_amount, status, delivery_method, parent_code, donation_consent, created_at";
  const res = status === undefined
    ? await pool.query<OrderRow & { created_at: Date }>(`SELECT ${cols} FROM orders WHERE session_id = $1 ORDER BY created_at DESC LIMIT 100`, [cartId])
    : await pool.query<OrderRow & { created_at: Date }>(`SELECT ${cols} FROM orders WHERE session_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 100`, [cartId, status]);
  const ids = res.rows.map((o) => o.id);
  const itemRows = ids.length === 0 ? [] : (await pool.query<{ order_id: string; product_id: string; name: string; name_en: string | null; quantity: number }>(
    `SELECT oi.order_id, oi.product_id, p.name, p.name_en, oi.quantity FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ANY($1)`,
    [ids])).rows;
  const byOrder = new Map<string, MineItem[]>();
  for (const it of itemRows) {
    const list = byOrder.get(it.order_id) ?? [];
    list.push({ product_id: it.product_id, name: it.name, name_en: it.name_en, quantity: it.quantity });
    byOrder.set(it.order_id, list);
  }
  // delivery_address disengaja HILANG dari objek (konvensi PII tulis-saja, lih. admin list).
  return res.rows.map((o) => ({
    order_id: o.id, items: byOrder.get(o.id) ?? [], mode: o.mode,
    scheduled_at: o.scheduled_at === null ? null : o.scheduled_at.toISOString(),
    total_amount: o.total_amount, paid_amount: o.paid_amount, status: o.status,
    delivery_method: o.delivery_method,
    parent_code: o.parent_code, donation_consent: o.donation_consent,
  }));
}

// Expire massal: pending_payment/underpaid yang updated_at-nya basi. Idempoten.
export async function expireStale(pool: Pool, olderThanHours: number): Promise<number> {
  const res = await pool.query(
    "UPDATE orders SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE status IN ('pending_payment','underpaid') AND updated_at < CURRENT_TIMESTAMP - ($1 || ' hours')::INTERVAL",
    [String(olderThanHours)]);
  return res.rowCount ?? 0;
}

export async function setStatus(pool: Pool, id: string, status: OrderStatus): Promise<Order | null> {
  // Hanya transisi dari pending_payment yang diterima (idempotent-safe).
  await pool.query("UPDATE orders SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'pending_payment'", [id, status]);
  return getOrder(pool, id);
}
