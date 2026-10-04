import { Sprite } from "./Sprite.tsx";
import { CROISSANT, BREAD_LOAF, CUPCAKE, DONUT, COOKIE, CAKE_SLICE, PRETZEL } from "./data/bakeryA.ts";
import { burstAt } from "../fx/fx.ts";
import { playSound } from "../fx/sound.ts";
import { useT } from "../i18n/t.ts";
import type { DictKey } from "../i18n/t.ts";

const TREATS = [
  { sprite: CROISSANT, label: "menu.pastry.croissant" },
  { sprite: BREAD_LOAF, label: "menu.pastry.bread-loaf" },
  { sprite: CUPCAKE, label: "menu.pastry.cupcake" },
  { sprite: DONUT, label: "menu.pastry.donut" },
  { sprite: COOKIE, label: "menu.pastry.cookie" },
  { sprite: CAKE_SLICE, label: "menu.pastry.cake-slice" },
  { sprite: PRETZEL, label: "menu.pastry.pretzel" },
] as const satisfies readonly { sprite: unknown; label: DictKey }[];

// Deretan roti di rak kayu (dekoratif tapi bisa diketuk: melompat + remah + bunyi).
export function PastryRow() {
  const t = useT();
  return (
    <div className="pastry-row" role="group" aria-label={t("menu.pastry.label")}>
      {TREATS.map(({ sprite, label }) => (
        <button
          key={sprite.name}
          type="button"
          className="pastry"
          aria-label={t("menu.pastry.poke", { name: t(label) })}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            burstAt(r.left + r.width / 2, r.top + r.height / 2, "crumbs");
            playSound("pop");
          }}
        >
          <Sprite sprite={sprite} />
        </button>
      ))}
    </div>
  );
}
