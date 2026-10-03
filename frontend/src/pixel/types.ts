// Sprite = grid ASCII. Satu karakter = satu piksel. '.' = transparan.
// Warna dari PALETTE (palette.ts) atau `palette` per-sprite (override/tambahan).
export type Sprite = {
  name: string;
  rows: readonly string[];
  palette?: Readonly<Record<string, string>>;
};
