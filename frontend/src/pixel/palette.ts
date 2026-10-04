// Palet global sprite "Serenity Café". Satu karakter = satu warna.
// '#' = currentColor (dipakai ikon monokrom; warna mengikuti teks sekitar).
// Sprite warna-penuh sebaiknya hanya memakai karakter di bawah ini; bila butuh warna
// lain, tambahkan lewat `palette` pada sprite itu (jarang).
export const PALETTE: Readonly<Record<string, string>> = {
  "#": "currentColor",

  // Garis tepi & netral hangat
  k: "#3b2a24", // outline espresso (garis luar sprite)
  K: "#6b4a3c", // outline lembut / bayangan tua
  w: "#fff9ea", // putih krem (highlight, piring)
  c: "#f6e7c8", // krem
  s: "#e3cfa3", // krem gelap / bayangan krem
  e: "#bdb3a6", // abu hangat terang
  E: "#8a8076", // abu hangat gelap

  // Hijau daun (merek Serenity)
  l: "#b8de8f", // hijau muda
  g: "#7fb069", // hijau daun
  G: "#4f7f4a", // hijau tua
  a: "#5f7f3a", // alpukat / zaitun
  A: "#3f5a28", // zaitun tua

  // Merah / oranye / kuning
  r: "#d9534f", // merah tomat
  R: "#a63a3a", // merah tua
  o: "#f0933b", // oranye
  O: "#c46a1e", // oranye tua
  y: "#f6ce6b", // kuning mentega
  Y: "#d9a441", // kuning tua
  m: "#f7b63b", // mangga

  // Cokelat
  t: "#c99a6b", // tan / roti
  b: "#8b5a3c", // cokelat
  B: "#5a3a28", // cokelat tua
  h: "#4a2e22", // cokelat cokelat-hitam (brownie)
  H: "#6b4332", // cokelat cokelat-hitam terang

  // Pink / ungu / biru
  p: "#f4a49a", // pink persik
  P: "#d9787a", // pink tua
  u: "#c3a8e0", // lavender
  U: "#7a5fa8", // ungu tua
  n: "#9ad0e8", // biru langit
  N: "#4a94ba", // biru tua
};
