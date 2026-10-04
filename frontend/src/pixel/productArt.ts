import type { Sprite } from "./types.ts";
import { SALAD_QUINOA_CHICKEN, RICE_RED_CHICKEN_BASIL, FOOD_DEFAULT } from "./data/foodA.ts";
import { BROWNIE_AVOCADO, CHIA_PUDDING_MANGO, DESSERT_DEFAULT } from "./data/foodB.ts";
import { JUICE_GREEN_APPLE_CUCUMBER, DRINK_DEFAULT, SMOOTHIE_BERRY } from "./data/foodC.ts";

type ArtKey = { name: string; category_id: string };
export type Stage = "food" | "dessert" | "drink";

// Ilustrasi pixel pengganti foto produk: kata kunci nama dulu, lalu fallback per kategori.
const BY_KEYWORD: ReadonlyArray<readonly [RegExp, Sprite]> = [
  [/salad/i, SALAD_QUINOA_CHICKEN],
  [/nasi|rice/i, RICE_RED_CHICKEN_BASIL],
  [/brownie|cokelat|coklat|chocolate/i, BROWNIE_AVOCADO],
  [/chia|puding|pudding/i, CHIA_PUDDING_MANGO],
  [/smoothie|berry|beri/i, SMOOTHIE_BERRY],
  [/jus|juice|hijau/i, JUICE_GREEN_APPLE_CUCUMBER],
];

export function stageFor(p: ArtKey): Stage {
  if (p.category_id === "cat_dessert") return "dessert";
  if (p.category_id === "cat_drink") return "drink";
  return "food";
}

export function spriteForProduct(p: ArtKey): Sprite {
  for (const [re, sprite] of BY_KEYWORD) if (re.test(p.name)) return sprite;
  const stage = stageFor(p);
  return stage === "dessert" ? DESSERT_DEFAULT : stage === "drink" ? DRINK_DEFAULT : FOOD_DEFAULT;
}
