import { useEffect, useRef, useState } from "react";
import { Sprite } from "./Sprite.tsx";
import { CAT_SIT_1, CAT_SIT_2 } from "./data/mascot.ts";
import { CAT_HAPPY } from "./data/mascot2.ts";
import { CHEF_HAT } from "./data/bakeryB.ts";
import { burstAt } from "../fx/fx.ts";
import { playSound } from "../fx/sound.ts";
import { useT } from "../i18n/t.ts";
import type { DictKey } from "../i18n/t.ts";

// Kunci frasa; diterjemahkan saat diklik (bahasa bisa berganti kapan saja).
const PHRASES: readonly DictKey[] = ["menu.cat.phrase1", "menu.cat.phrase2", "menu.cat.phrase3", "menu.cat.phrase4", "menu.cat.phrase5", "menu.cat.phrase6"];

// Kucing juru roti di atas meja. Klik/ketuk/Enter: wajah senang, hati melayang, suara "meow", gelembung ucapan.
export function CatMascot({ className }: { className?: string }) {
  const t = useT();
  const btn = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  const last = useRef(-1);
  const [happy, setHappy] = useState(false);
  const [msgKey, setMsgKey] = useState<DictKey | null>(null);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);

  function pet(): void {
    let i = Math.floor(Math.random() * PHRASES.length);
    if (i === last.current) i = (i + 1) % PHRASES.length;
    last.current = i;
    setHappy(true);
    setMsgKey(PHRASES[i] ?? "menu.cat.phrase1");
    const r = btn.current?.getBoundingClientRect();
    if (r !== undefined) burstAt(r.left + r.width * 0.5, r.top - 4, "hearts");
    playSound("meow");
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [window.setTimeout(() => setHappy(false), 1300), window.setTimeout(() => setMsgKey(null), 2600)];
  }

  const msg = msgKey === null ? "" : t(msgKey);
  return (
    <>
      <button ref={btn} type="button" className={`cat-mascot${happy ? " is-happy" : ""}${className === undefined ? "" : ` ${className}`}`} aria-label={t("menu.cat.label")} onClick={pet}>
        <Sprite sprite={CAT_SIT_1} className="cat-frame cat-frame--idle" />
        <Sprite sprite={CAT_SIT_2} className="cat-frame cat-frame--blink" />
        <Sprite sprite={CAT_HAPPY} className="cat-frame cat-frame--happy" />
        <Sprite sprite={CHEF_HAT} className="cat-hat" />
      </button>
      {msg !== "" ? <span className="fx-bubble cat-bubble" aria-hidden="true">{msg}</span> : null}
      <span className="sr-only" aria-live="polite">{msg}</span>
    </>
  );
}
