import type { DictKey } from "../i18n/t.ts";

// Alur pemenuhan setelah dibayar: paid -> preparing -> ready -> done (urutan sama dengan backend admin).
export const FULFIL_FLOW = ["paid", "preparing", "ready", "done"] as const;

// Indeks tahap saat ini; -1 bila order belum/tidak masuk alur pemenuhan (menunggu bayar, kedaluwarsa, batal).
export function fulfilIndex(status: string): number {
  return (FULFIL_FLOW as readonly string[]).indexOf(status);
}

export const STATUS_LABEL: Record<string, DictKey> = {
  pending_payment: "orders.status.pending",
  underpaid: "orders.status.underpaid",
  paid: "orders.status.paidFull",
  preparing: "orders.status.preparing",
  ready: "orders.status.ready",
  done: "orders.status.done",
  expired: "orders.status.expired",
  cancelled: "orders.status.cancelled",
};

export const STEP_LABEL: Record<(typeof FULFIL_FLOW)[number], DictKey> = {
  paid: "orders.step.paid",
  preparing: "orders.step.preparing",
  ready: "orders.step.ready",
  done: "orders.step.done",
};
