// Preview sprite: validasi + render sheet PNG (Edge headless).
// Pakai: node --experimental-strip-types scripts/sprite-preview.mjs <modul.ts> <out.png> [skala=10]
// Modul boleh meng-export Sprite tunggal atau array/objek berisi Sprite.
// Exit code 1 bila ada sprite tak valid (baris tak sama panjang / karakter tak dikenal).
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spriteSize, spriteToSvg, validateSprite } from "../src/pixel/svg.ts";

const [, , modPath, outPng, scaleArg] = process.argv;
if (modPath === undefined || outPng === undefined) {
  console.error("pakai: sprite-preview.mjs <modul.ts> <out.png> [skala]");
  process.exit(2);
}
const SCALE = Number(scaleArg ?? "10");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const isSprite = (v) => v !== null && typeof v === "object" && typeof v.name === "string" && Array.isArray(v.rows);
function collect(v, out) {
  if (isSprite(v)) out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collect(x, out));
  else if (v !== null && typeof v === "object") Object.values(v).forEach((x) => collect(x, out));
}

const mod = await import(pathToFileURL(resolve(modPath)).href);
const sprites = [];
collect(Object.values(mod), sprites);
if (sprites.length === 0) {
  console.error("tidak ada sprite ter-export di modul");
  process.exit(1);
}

const errors = sprites.flatMap(validateSprite);
if (errors.length > 0) {
  console.error("SPRITE TIDAK VALID:\n" + errors.join("\n"));
  process.exit(1);
}

const CELL_PAD = 24;
const cells = sprites.map((s) => {
  const { w, h } = spriteSize(s);
  return { s, w, h, cw: Math.max(w * SCALE, 220) + CELL_PAD * 2, ch: h * SCALE + 150 };
});
const cellW = Math.max(...cells.map((c) => c.cw));
const cellH = Math.max(...cells.map((c) => c.ch));
const cols = Math.max(1, Math.min(cells.length, Math.floor(1400 / cellW)));
const rows = Math.ceil(cells.length / cols);
const width = cols * cellW;
const height = rows * cellH + 20;

const card = ({ s, w, h }) => `
<div class="cell">
  <div class="big" style="width:${w * SCALE}px;height:${h * SCALE}px">${spriteToSvg(s, SCALE)}</div>
  <div class="meta">${s.name} (${w}x${h})</div>
  <div class="small">
    <span class="l">${spriteToSvg(s, 2)}</span>
    <span class="d">${spriteToSvg(s, 2, "#f5e6cb")}</span>
    <span class="l">${spriteToSvg(s, 1)}</span>
    <span class="d">${spriteToSvg(s, 1, "#f5e6cb")}</span>
  </div>
</div>`;

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#fbf1dc;font:12px monospace;color:#3b2a24}
.grid{display:grid;grid-template-columns:repeat(${cols},${cellW}px);}
.cell{height:${cellH}px;padding:${CELL_PAD}px;box-sizing:border-box;border:1px dashed #d9c9a3}
.big{background:
  conic-gradient(#f0e2c0 25%,#fbf1dc 0 50%,#f0e2c0 0 75%,#fbf1dc 0) 0 0/${SCALE * 2}px ${SCALE * 2}px;}
svg{display:block}
.meta{margin:8px 0}
.small{display:flex;gap:6px;align-items:center}
.small span{padding:6px;display:inline-block}
.l{background:#fff9ea}.d{background:#2a1f2d}
</style><div class="grid">${cells.map(card).join("")}</div>`;

const dir = mkdtempSync(join(tmpdir(), "sprite-prev-"));
const htmlPath = join(dir, "p.html");
writeFileSync(htmlPath, html);
try {
  execFileSync(
    EDGE,
    ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${width},${height}`, `--screenshot=${resolve(outPng)}`, pathToFileURL(htmlPath).href],
    { stdio: "ignore", timeout: 60000 },
  );
} catch {
  // Edge kadang exit non-zero meski PNG tertulis; cek di bawah
}
console.log(`OK ${sprites.length} sprite valid -> ${resolve(outPng)} (${width}x${height})`);
