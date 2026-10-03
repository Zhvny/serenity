import type { CSSProperties, ReactNode } from "react";
import { Sprite } from "./Sprite.tsx";
import type { Sprite as SpriteData } from "./types.ts";
import { CLOUD_1, CLOUD_2, SUN, MOON, STAR } from "./data/scene.ts";
import { DISPLAY_CASE, OVEN, OVEN_GLOW, CASH_REGISTER, SHOP_BELL, ROLLING_PIN, WHISK } from "./data/bakeryB.ts";
import { CROISSANT, CUPCAKE, DONUT, COOKIE, BREAD_LOAF, CAKE_SLICE } from "./data/bakeryA.ts";
import { CatMascot } from "./CatMascot.tsx";
import { useT } from "../i18n/t.ts";

// Satu benda di adegan: posisi (x,y) & lebar (w) dalam satuan piksel adegan (--su, lihat theme-bakery-menu.css).
function Item({ sprite, x, y, w, className = "", children }: { sprite?: SpriteData; x: number; y: number; w?: number; className?: string; children?: ReactNode }) {
  const style = { "--x": x, "--y": y, "--w": w } as CSSProperties;
  return (
    <span className={`bk-item ${className}`} style={style}>
      {sprite !== undefined ? <Sprite sprite={sprite} /> : null}
      {children}
    </span>
  );
}

// Interior toko roti: jendela (siang/malam ikut tema), rak berisi alat kue, etalase kaca dengan roti mungil,
// kasir, oven menyala yang berkedip, lonceng toko, dan kucing juru roti yang bisa dielus.
export function HeroScene() {
  const t = useT();
  return (
    <div className="scene bakery-scene" role="group" aria-label={t("menu.scene.label")}>
      <div className="bk-wainscot" />
      <div className="bk-window">
        <Item sprite={SUN} x={7} y={-3} w={24} className="bk-sun" />
        <Item sprite={MOON} x={7} y={-3} w={24} className="bk-moon" />
        <Item sprite={STAR} x={2} y={3} w={9} className="bk-star bk-star--1" />
        <Item sprite={STAR} x={22} y={11} w={9} className="bk-star bk-star--2" />
        <Item sprite={CLOUD_1} x={1} y={8} w={24} className="bk-cloud bk-cloud--1" />
        <Item sprite={CLOUD_2} x={14} y={13} w={16} className="bk-cloud bk-cloud--2" />
      </div>
      <Item sprite={SHOP_BELL} x={40} y={1} w={10} className="bk-bell" />
      <div className="bk-shelf" />
      <Item sprite={WHISK} x={56} y={0} w={10} />
      <Item sprite={ROLLING_PIN} x={70} y={10} w={20} />
      <Item sprite={OVEN} x={88} y={32} w={24} className="bk-oven" />
      <Item sprite={OVEN_GLOW} x={88} y={32} w={24} className="bk-oven bk-oven--glow" />
      <Item sprite={DISPLAY_CASE} x={3} y={30} w={48} className="bk-case" />
      <Item sprite={CROISSANT} x={9} y={32} w={8} className="bk-treat" />
      <Item sprite={CUPCAKE} x={21} y={32} w={8} className="bk-treat" />
      <Item sprite={DONUT} x={33} y={32} w={8} className="bk-treat" />
      <Item sprite={COOKIE} x={9} y={41} w={8} className="bk-treat" />
      <Item sprite={BREAD_LOAF} x={21} y={41} w={8} className="bk-treat" />
      <Item sprite={CAKE_SLICE} x={33} y={41} w={8} className="bk-treat" />
      <Item sprite={CASH_REGISTER} x={34} y={16} w={16} className="bk-register" />
      <CatMascot className="bk-cat" />
      <div className="bk-counter" />
    </div>
  );
}
