// Isi data tetap dari basis data yang perlu dilokalkan (nama kategori & alergen yang dikenal).
// Nama produk/deskripsi/tag berasal dari admin dan TIDAK diterjemahkan. Nama tak dikenal -> dipakai apa adanya.
import type { Lang } from "./store.ts";

const CATEGORY_EN: Readonly<Record<string, string>> = {
  cat_dessert: "Healthy Desserts",
  cat_food: "Healthy Meals",
  cat_drink: "Healthy Drinks",
};

const ALLERGEN_EN: Readonly<Record<string, string>> = {
  kacang: "Peanuts",
  susu: "Milk",
  gluten: "Gluten",
  telur: "Egg",
  seafood: "Seafood",
  kedelai: "Soy",
};

export function categoryLabel(c: { id: string; name: string }, lang: Lang): string {
  return lang === "en" ? (CATEGORY_EN[c.id] ?? c.name) : c.name;
}

export function allergenLabel(name: string, lang: Lang): string {
  return lang === "en" ? (ALLERGEN_EN[name.toLowerCase()] ?? name) : name;
}
