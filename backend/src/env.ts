import { readFileSync } from "node:fs";

// Parser .env minimal (tanpa dependency): KEY=VALUE per baris, abaikan komentar/baris kosong,
// buang kutip pembungkus. Dikembalikan sebagai objek — pemanggil yang memutuskan assign.
export function parseDotenv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// Muat .env dan PAKSA menang atas env ambient (konfigurasi lokal dev harus menang atas
// DATABASE_URL proyek lain yang ter-set di shell). File tak ada -> no-op (prod/CI).
export function loadDotenvOverride(path: URL | string, env: NodeJS.ProcessEnv = process.env): void {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const [k, v] of Object.entries(parseDotenv(raw))) {
    env[k] = v;
  }
}
