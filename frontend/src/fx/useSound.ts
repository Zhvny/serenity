import { useSyncExternalStore } from "react";
import { SOUND_EVENT, isSoundOn, setSoundOn } from "./sound.ts";

function subscribe(cb: () => void): () => void {
  window.addEventListener(SOUND_EVENT, cb);
  return () => window.removeEventListener(SOUND_EVENT, cb);
}

// [suara aktif?, setter] — sinkron di semua komponen lewat event `serenity:sound`.
export function useSound(): readonly [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribe, isSoundOn, () => false);
  return [on, setSoundOn] as const;
}
