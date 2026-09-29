import { randomUUID } from "node:crypto";
import type { CartItem, Order, OrderMode, OrderStatus } from "../types.js";

const orders = new Map<string, Order>();
let dayKey = "";
let seq = 0;

export function nextOrderId(now: Date = new Date()): string {
  const key = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  if (key !== dayKey) {
    dayKey = key;
    seq = 0;
  }
  seq += 1;
  return `HP-${key}-${String(seq).padStart(4, "0")}`;
}

// ponytail: in-memory store + counter; ganti sequence DB bila multi-instance.
export function createOrder(items: Array<{ product_id: string; quantity: number }>, mode: OrderMode, scheduled_at: string | null, total: number): Order {
  const orderItems: CartItem[] = items.map((i) => ({ item_id: randomUUID(), product_id: i.product_id, quantity: i.quantity, note: null }));
  const order: Order = { order_id: nextOrderId(), items: orderItems, mode, scheduled_at, total_amount: total, status: "pending_payment" };
  orders.set(order.order_id, order);
  return order;
}

export function getOrder(id: string): Order | null {
  return orders.get(id) ?? null;
}

export function setStatus(id: string, status: OrderStatus): Order | null {
  const order = orders.get(id);
  if (order === undefined) return null;
  if (order.status !== "pending_payment") return order;
  order.status = status;
  return order;
}
