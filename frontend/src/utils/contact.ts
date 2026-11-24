// Aturan kontak pemesan, sama dengan backend/src/services/contact.ts.

export function normalizeName(raw: string): string | null {
  const s = raw.replace(/\s+/g, " ").trim();
  return s.length >= 2 && s.length <= 80 ? s : null;
}

// "0812-3456-7890", "+62 812...", "62812...", "812..." -> "62812..."; null bila bukan nomor seluler Indonesia.
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[\s().-]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (!/^\d+$/.test(d)) return null;
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return /^628\d{7,12}$/.test(d) ? d : null;
}
