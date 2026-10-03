// Bahasa antarmuka: hanya Indonesia (id, default) dan Inggris (en). Disimpan di localStorage.
// Tanpa provider: store modul + event, jadi komponen/tes tanpa pembungkus tetap jalan (default "id").
export type Lang = "id" | "en";
export const LANGS: readonly Lang[] = ["id", "en"];
export const LANG_EVENT = "serenity:lang";
const KEY = "serenity-lang";

function read(): Lang {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "en" ? "en" : "id";
  } catch {
    return "id";
  }
}

let lang: Lang = read();
if (typeof document !== "undefined") document.documentElement.lang = lang;

export function getLang(): Lang {
  return lang;
}

export function setLang(next: Lang): void {
  if (next !== "id" && next !== "en") return;
  lang = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    // abaikan (mode privat)
  }
  if (typeof document !== "undefined") document.documentElement.lang = next;
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(LANG_EVENT));
}

// Locale untuk Intl/toLocaleString menurut bahasa aktif.
export function localeOf(l: Lang = lang): string {
  return l === "en" ? "en-US" : "id-ID";
}
