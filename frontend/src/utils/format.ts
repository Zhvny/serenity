export function rupiah(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

// Angka gizi dari Postgres NUMERIC datang sebagai string ("28.00"): tampilkan rapi ("28", "6.5"); kosong -> "–".
export function fmtNutrient(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "–";
  const n = Number(v);
  if (!Number.isFinite(n)) return "–";
  return String(Math.round(n * 10) / 10);
}
