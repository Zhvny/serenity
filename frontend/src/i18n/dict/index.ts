import * as shell from "./shell.ts";
import * as menu from "./menu.ts";
import * as shop from "./shop.ts";
import * as orders from "./orders.ts";

// Gabungan semua area. Kunci harus unik antar-area (dijaga oleh tes). EN wajib punya semua kunci ID (dijaga tipe).
export const ID = { ...shell.id, ...menu.id, ...shop.id, ...orders.id } as const;
export type DictKey = keyof typeof ID;
export const EN: Record<DictKey, string> = { ...shell.en, ...menu.en, ...shop.en, ...orders.en };
