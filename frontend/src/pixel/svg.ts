import { PALETTE } from "./palette.ts";
import type { Sprite } from "./types.ts";

export type Run = { color: string; d: string };

export function spriteSize(s: Sprite): { w: number; h: number } {
  return { w: Math.max(0, ...s.rows.map((r) => r.length)), h: s.rows.length };
}

// Gabung run horizontal per warna -> satu <path> per warna (ringan, tanpa anti-alias).
export function spriteRuns(s: Sprite): Run[] {
  const pal = { ...PALETTE, ...(s.palette ?? {}) };
  const byColor = new Map<string, string>();
  s.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row.charAt(x);
      let end = x + 1;
      while (end < row.length && row.charAt(end) === ch) end++;
      const color = ch === "." ? undefined : pal[ch];
      if (color !== undefined) {
        const seg = `M${x} ${y}h${end - x}v1h-${end - x}z`;
        byColor.set(color, (byColor.get(color) ?? "") + seg);
      }
      x = end;
    }
  });
  return [...byColor.entries()].map(([color, d]) => ({ color, d }));
}

// Daftar masalah sprite (kosong = valid): baris tak sama panjang, karakter tak dikenal.
export function validateSprite(s: Sprite): string[] {
  const errs: string[] = [];
  const pal = { ...PALETTE, ...(s.palette ?? {}) };
  const w = s.rows[0]?.length ?? 0;
  if (s.rows.length === 0) errs.push(`${s.name}: tanpa baris`);
  s.rows.forEach((row, i) => {
    if (row.length !== w) errs.push(`${s.name}: baris ${i} panjang ${row.length}, seharusnya ${w}`);
    for (const ch of row) {
      if (ch !== "." && pal[ch] === undefined) {
        errs.push(`${s.name}: baris ${i} karakter tak dikenal '${ch}'`);
        break;
      }
    }
  });
  return errs;
}

// SVG string murni (untuk preview Node / pembuatan favicon). `size` = px per piksel sprite.
export function spriteToSvg(s: Sprite, size = 1, color = "#3b2a24"): string {
  const { w, h } = spriteSize(s);
  const paths = spriteRuns(s)
    .map((r) => `<path fill="${r.color === "currentColor" ? color : r.color}" d="${r.d}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * size}" height="${h * size}" shape-rendering="crispEdges">${paths}</svg>`;
}
