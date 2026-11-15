// Isi data tetap dari basis data yang perlu dilokalkan (nama kategori & alergen yang dikenal,
// plus kolom *_en produk/post via pickContent; fallback Indonesia bila EN kosong).
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

const TAG_LABEL: Readonly<Record<string, { id: string; en: string }>> = {
  vegan: { id: "Vegan", en: "Vegan" },
  "gluten-free": { id: "Bebas gluten", en: "Gluten-free" },
  "high-protein": { id: "Tinggi protein", en: "High protein" },
  "low-carb": { id: "Rendah karbo", en: "Low carb" },
  "low-sugar": { id: "Rendah gula", en: "Low sugar" },
  "low-calorie": { id: "Rendah kalori", en: "Low calorie" },
  "high-fiber": { id: "Tinggi serat", en: "High fiber" },
  "sugar-free": { id: "Tanpa gula", en: "Sugar-free" },
};

// Tag di basis data berupa slug Inggris ("high-protein"); tampilkan dalam bahasa pengguna.
export function tagLabel(tag: string, lang: Lang): string {
  const hit = TAG_LABEL[tag.toLowerCase()];
  if (hit !== undefined) return lang === "en" ? hit.en : hit.id;
  const plain = tag.replace(/[-_]/g, " ");
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

export function categoryLabel(c: { id: string; name: string }, lang: Lang): string {
  return lang === "en" ? (CATEGORY_EN[c.id] ?? c.name) : c.name;
}

export function allergenLabel(name: string, lang: Lang): string {
  return lang === "en" ? (ALLERGEN_EN[name.toLowerCase()] ?? name) : name;
}

// Pilih teks sesuai bahasa; EN kosong/null -> fallback Indonesia.
export function pickContent(lang: Lang, en: string | null | undefined, id: string): string {
  return lang === "en" && en !== null && en !== undefined && en !== "" ? en : id;
}
