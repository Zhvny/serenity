import type { Sprite as SpriteData } from "./types.ts";
import { spriteRuns, spriteSize } from "./svg.ts";

// Render sprite sebagai SVG tajam (tanpa anti-alias). Ukuran ikut CSS (width/height) atau
// `scale` (px per piksel sprite). Dekoratif (aria-hidden) kecuali diberi `title`.
export function Sprite({ sprite, scale, className, title }: { sprite: SpriteData; scale?: number; className?: string; title?: string }) {
  const { w, h } = spriteSize(sprite);
  return (
    <svg
      className={className === undefined ? "sprite" : `sprite ${className}`}
      viewBox={`0 0 ${w} ${h}`}
      width={scale === undefined ? undefined : w * scale}
      height={scale === undefined ? undefined : h * scale}
      shapeRendering="crispEdges"
      role={title === undefined ? undefined : "img"}
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
    >
      {title === undefined ? null : <title>{title}</title>}
      {spriteRuns(sprite).map((r) => (
        <path key={r.color} fill={r.color} d={r.d} />
      ))}
    </svg>
  );
}
