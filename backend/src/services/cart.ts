import { randomUUID } from "node:crypto";
import type { CartItem } from "../types.js";

const carts = new Map<string, CartItem[]>();

export function getCart(id: string): CartItem[] {
  return carts.get(id) ?? [];
}

export function addItem(id: string, product_id: string, quantity: number, note: string | null): CartItem {
  const items = getCart(id);
  const item: CartItem = { item_id: randomUUID(), product_id, quantity, note };
  items.push(item);
  carts.set(id, items);
  return item;
}

export function updateItem(cartId: string, itemId: string, quantity: number, note?: string | null): CartItem | null {
  const items = getCart(cartId);
  const item = items.find((i) => i.item_id === itemId);
  if (item === undefined) return null;
  item.quantity = quantity;
  if (note !== undefined) item.note = note;
  return item;
}

export function removeItem(cartId: string, itemId: string): boolean {
  const items = getCart(cartId);
  const ix = items.findIndex((i) => i.item_id === itemId);
  if (ix === -1) return false;
  items.splice(ix, 1);
  return true;
}
