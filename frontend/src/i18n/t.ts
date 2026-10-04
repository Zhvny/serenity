import { useCallback } from "react";
import { EN, ID } from "./dict/index.ts";
import type { DictKey } from "./dict/index.ts";
import { getLang } from "./store.ts";
import type { Lang } from "./store.ts";
import { useLang } from "./useLang.ts";

export type { DictKey } from "./dict/index.ts";
export type Params = Readonly<Record<string, string | number>>;

const DICTS: Record<Lang, Readonly<Record<string, string>>> = { id: ID, en: EN };

// Terjemahkan kunci; fallback ke Indonesia lalu ke kunci itu sendiri. `{nama}` diganti dari params.
export function translate(lang: Lang, key: DictKey, params?: Params): string {
  const raw = DICTS[lang][key] ?? DICTS.id[key] ?? key;
  if (params === undefined) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

export type TFn = (key: DictKey, params?: Params) => string;

// Hook untuk komponen: re-render otomatis saat bahasa berganti.
export function useT(): TFn {
  const [lang] = useLang();
  return useCallback((key, params) => translate(lang, key, params), [lang]);
}

// Untuk kode non-komponen (mis. dipanggil saat event): pakai bahasa aktif saat ini.
export function tNow(key: DictKey, params?: Params): string {
  return translate(getLang(), key, params);
}
