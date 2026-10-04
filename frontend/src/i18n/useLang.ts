import { useSyncExternalStore } from "react";
import { LANG_EVENT, getLang, setLang } from "./store.ts";
import type { Lang } from "./store.ts";

function subscribe(cb: () => void): () => void {
  window.addEventListener(LANG_EVENT, cb);
  return () => window.removeEventListener(LANG_EVENT, cb);
}

// [bahasa aktif, setter] — sinkron di semua komponen lewat event `serenity:lang`.
export function useLang(): readonly [Lang, (l: Lang) => void] {
  const lang = useSyncExternalStore(subscribe, getLang, () => "id" as Lang);
  return [lang, setLang] as const;
}
