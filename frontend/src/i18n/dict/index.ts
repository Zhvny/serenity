import * as shell from "./shell.ts";
import * as menu from "./menu.ts";
import * as shop from "./shop.ts";
import * as orders from "./orders.ts";
import * as landing from "./landing.ts";
import * as funfact from "./funfact.ts";
import * as post from "./post.ts";

// Gabungan semua area. Kunci harus unik antar-area (dijaga oleh tes). EN wajib punya semua kunci ID (dijaga tipe).
export const ID = { ...shell.id, ...menu.id, ...shop.id, ...orders.id, ...landing.id, ...funfact.id, ...post.id } as const;
export type DictKey = keyof typeof ID;
export const EN: Record<DictKey, string> = { ...shell.en, ...menu.en, ...shop.en, ...orders.en, ...landing.en, ...funfact.en, ...post.en };
