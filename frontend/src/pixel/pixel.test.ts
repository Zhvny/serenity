import { describe, it, expect } from "vitest";
import type { Sprite } from "./types.ts";
import { spriteRuns, spriteSize, validateSprite } from "./svg.ts";
import { spriteForProduct, stageFor } from "./productArt.ts";
import { ICONS } from "./data/icons.ts";
import * as foodA from "./data/foodA.ts";
import * as foodB from "./data/foodB.ts";
import * as foodC from "./data/foodC.ts";
import * as scene from "./data/scene.ts";
import * as mascot from "./data/mascot.ts";
import * as bakeryA from "./data/bakeryA.ts";
import * as bakeryB from "./data/bakeryB.ts";
import * as signs from "./data/signs.ts";
import * as mascot2 from "./data/mascot2.ts";
import * as fxsprites from "./data/fxsprites.ts";
import { ICONS_BAKERY } from "./data/iconsBakery.ts";

const isSprite = (v: unknown): v is Sprite => typeof v === "object" && v !== null && "rows" in v && "name" in v;
const all: Sprite[] = [...Object.values(foodA), ...Object.values(foodB), ...Object.values(foodC), ...Object.values(scene), ...Object.values(mascot), ...Object.values(ICONS), ...Object.values(bakeryA), ...Object.values(bakeryB), ...Object.values(signs), ...Object.values(mascot2), ...Object.values(fxsprites), ...Object.values(ICONS_BAKERY)].filter(isSprite);

describe("pixel sprite renderer", () => {
  it("menggabung run horizontal per warna dan melewati piksel transparan", () => {
    const s: Sprite = { name: "t", rows: ["kk.k", "..kk"] };
    const runs = spriteRuns(s);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.d).toBe("M0 0h2v1h-2zM3 0h1v1h-1zM2 1h2v1h-2z");
    expect(spriteSize(s)).toEqual({ w: 4, h: 2 });
  });

  it("validateSprite menolak baris tak sama panjang & karakter tak dikenal", () => {
    expect(validateSprite({ name: "ok", rows: ["kk", "kk"] })).toEqual([]);
    expect(validateSprite({ name: "pendek", rows: ["kk", "k"] })).toHaveLength(1);
    expect(validateSprite({ name: "aneh", rows: ["k?"] })).toHaveLength(1);
  });
});

describe("pustaka sprite", () => {
  it("memuat sprite dalam jumlah wajar", () => {
    expect(all.length).toBeGreaterThanOrEqual(90);
  });

  it.each(all.map((s) => [s.name, s] as const))("%s valid (baris sama panjang, karakter dikenal)", (_n, s) => {
    expect(validateSprite(s)).toEqual([]);
  });

  it("nama sprite unik di dalam tiap berkas data", () => {
    const groups: Record<string, unknown>[] = [foodA, foodB, foodC, scene, mascot, ICONS, bakeryA, bakeryB, signs, mascot2, fxsprites, ICONS_BAKERY];
    for (const g of groups) {
      const names = Object.values(g).filter(isSprite).map((s) => s.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("sprite makanan/minuman 32x32; ikon 16x16 monokrom", () => {
    for (const s of [...Object.values(foodA), ...Object.values(foodB), ...Object.values(foodC)].filter(isSprite)) {
      expect(spriteSize(s)).toEqual({ w: 32, h: 32 });
    }
    for (const [key, s] of Object.entries(ICONS)) {
      expect(s.name).toBe(key);
      expect(spriteSize(s)).toEqual({ w: 16, h: 16 });
      expect(s.rows.every((r) => /^[#.]+$/.test(r))).toBe(true);
    }
  });
});

describe("sprite toko roti", () => {
  it("pastry 24x24, ikon bakery 16x16 monokrom, bunting 12x14 dengan tali di baris atas", () => {
    for (const s of Object.values(bakeryA).filter(isSprite)) expect(spriteSize(s)).toEqual({ w: 24, h: 24 });
    for (const [key, s] of Object.entries(ICONS_BAKERY)) {
      expect(s.name).toBe(key);
      expect(spriteSize(s)).toEqual({ w: 16, h: 16 });
      expect(s.rows.every((r) => /^[#.]+$/.test(r))).toBe(true);
    }
    for (const s of [signs.BUNTING_PINK, signs.BUNTING_CREAM, signs.BUNTING_MINT]) {
      expect(spriteSize(s)).toEqual({ w: 12, h: 14 });
      expect(s.rows[0]?.includes(".")).toBe(false); // tali menyambung penuh agar bendera bersambung
    }
  });

  it("kontrak ukuran sprite yang dipakai komponen", () => {
    expect(spriteSize(bakeryB.DISPLAY_CASE)).toEqual({ w: 48, h: 30 });
    expect(spriteSize(bakeryB.OVEN)).toEqual(spriteSize(bakeryB.OVEN_GLOW));
    expect(spriteSize(mascot2.CAT_HAPPY)).toEqual(spriteSize(mascot.CAT_SIT_1));
    expect(spriteSize(signs.SIGN_BOARD)).toEqual({ w: 44, h: 20 });
    expect(spriteSize(signs.CHALKBOARD)).toEqual({ w: 40, h: 28 });
    expect(spriteSize(signs.PRICE_TAG)).toEqual({ w: 14, h: 18 });
  });
});

describe("ilustrasi produk", () => {
  it("memilih sprite menurut kata kunci nama, lalu kategori", () => {
    expect(spriteForProduct({ name: "Salad Quinoa Ayam Grilled", category_id: "cat_food" })).toBe(foodA.SALAD_QUINOA_CHICKEN);
    expect(spriteForProduct({ name: "Brownie Alpukat Cokelat Hitam", category_id: "cat_dessert" })).toBe(foodB.BROWNIE_AVOCADO);
    expect(spriteForProduct({ name: "Jus Hijau Apel Timun", category_id: "cat_drink" })).toBe(foodC.JUICE_GREEN_APPLE_CUCUMBER);
    expect(spriteForProduct({ name: "Menu Baru", category_id: "cat_dessert" })).toBe(foodB.DESSERT_DEFAULT);
    expect(spriteForProduct({ name: "Menu Baru", category_id: "cat_drink" })).toBe(foodC.DRINK_DEFAULT);
    expect(spriteForProduct({ name: "Menu Baru", category_id: "cat_lain" })).toBe(foodA.FOOD_DEFAULT);
  });

  it("stageFor memetakan kategori ke warna panggung", () => {
    expect(stageFor({ name: "x", category_id: "cat_dessert" })).toBe("dessert");
    expect(stageFor({ name: "x", category_id: "cat_drink" })).toBe("drink");
    expect(stageFor({ name: "x", category_id: "cat_food" })).toBe("food");
  });
});
