// Ikon pixel-art (grid 16x16, monokrom). Warna = currentColor, ukuran = 1em (ikut font-size).
// aria-hidden secara default; beri `title` untuk ikon bermakna. Gambar ikon: src/pixel/data/icons.ts & iconsBakery.ts.
import { Sprite } from "../pixel/Sprite.tsx";
import { ICONS } from "../pixel/data/icons.ts";
import { ICONS_BAKERY } from "../pixel/data/iconsBakery.ts";

export type IconName =
  | "cart" | "warning" | "check" | "arrow-right" | "leaf" | "clock" | "spark" | "sun" | "moon"
  | "heart" | "star" | "pin" | "plus" | "minus" | "trash" | "receipt" | "bag" | "qr"
  | "volume-on" | "volume-off" | "croissant" | "cookie" | "whisk" | "bread" | "oven" | "bell";

const ALL = { ...ICONS, ...ICONS_BAKERY };

export function Icon({ name, title, className }: { name: IconName; title?: string; className?: string }) {
  const sprite = ALL[name];
  if (sprite === undefined) return null;
  return <Sprite sprite={sprite} className={className === undefined ? "icon" : `icon ${className}`} title={title} />;
}
