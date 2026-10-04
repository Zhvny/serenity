// Efek partikel pixel (percikan, hati, remah, konfeti) + roti terbang ke keranjang.
// Semua no-op bila: bukan browser, prefers-reduced-motion, atau Element.animate tak tersedia (jsdom).
import type { Sprite } from "../pixel/types.ts";
import { spriteToSvg } from "../pixel/svg.ts";
import { SPARKLE_BURST_1, SPARKLE_BURST_2, HEART_FLOAT, CRUMB_A, CRUMB_B, CRUMB_C, CONFETTI_PINK, CONFETTI_BUTTER, CONFETTI_MINT, CONFETTI_SKY } from "../pixel/data/fxsprites.ts";
import { CROISSANT } from "../pixel/data/bakeryA.ts";

export type BurstKind = "sparkle" | "hearts" | "crumbs" | "confetti";

const MAX_NODES = 24;
const TARGET = "[data-cart-target]";
let layer: HTMLElement | null = null;
let alive = 0;

function canAnimate(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  return typeof Element !== "undefined" && typeof Element.prototype.animate === "function";
}

function getLayer(): HTMLElement {
  if (layer !== null && layer.isConnected) return layer;
  layer = document.createElement("div");
  layer.className = "fx-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  return layer;
}

function node(sprite: Sprite, scale: number, x: number, y: number): HTMLElement | null {
  if (alive >= MAX_NODES) return null;
  const el = document.createElement("span");
  el.className = "fx-particle";
  el.innerHTML = spriteToSvg(sprite, scale);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  getLayer().appendChild(el);
  alive++;
  return el;
}

function release(el: HTMLElement): void {
  el.remove();
  alive = Math.max(0, alive - 1);
}

// Gerakkan `el` lewat daftar offset (px) dengan langkah diskret (gaya pixel) lalu hapus.
function play(el: HTMLElement, frames: Array<{ x: number; y: number; o?: number }>, ms: number): void {
  const kf = frames.map((f, i) => ({ transform: `translate(${Math.round(f.x)}px, ${Math.round(f.y)}px)`, opacity: f.o ?? 1, offset: frames.length === 1 ? 0 : i / (frames.length - 1), easing: "steps(1, end)" }));
  const anim = el.animate(kf, { duration: ms, fill: "forwards" });
  anim.onfinish = () => release(el);
  anim.oncancel = () => release(el);
}

export function burstAt(x: number, y: number, kind: BurstKind = "sparkle"): void {
  if (!canAnimate()) return;
  if (kind === "hearts") {
    for (let i = 0; i < 4; i++) {
      const el = node(HEART_FLOAT, 3, x - 39 + i * 26, y);
      if (el !== null) play(el, [0, 1, 2, 3, 4, 5, 6].map((s) => ({ x: (i % 2 === 0 ? 1 : -1) * (s % 2) * 3, y: -s * 9, o: s > 4 ? 0.5 : 1 })), 900 + i * 90);
    }
    return;
  }
  if (kind === "crumbs") {
    const crumbs = [CRUMB_A, CRUMB_B, CRUMB_C];
    for (let i = 0; i < 8; i++) {
      const el = node(crumbs[i % 3] ?? CRUMB_A, 3, x, y);
      const dir = i % 2 === 0 ? 1 : -1;
      const vx = dir * (4 + (i % 4) * 2.5);
      if (el !== null) play(el, [0, 1, 2, 3, 4, 5].map((s) => ({ x: vx * s, y: -10 * s + 3.2 * s * s, o: s > 4 ? 0.4 : 1 })), 650);
    }
    return;
  }
  if (kind === "confetti") {
    const bits = [CONFETTI_PINK, CONFETTI_BUTTER, CONFETTI_MINT, CONFETTI_SKY];
    for (let i = 0; i < 12; i++) {
      const el = node(bits[i % 4] ?? CONFETTI_PINK, 3, x, y);
      const a = (i / 12) * Math.PI * 2;
      const r = 26 + (i % 3) * 10;
      if (el !== null) play(el, [0, 1, 2, 3, 4, 5].map((s) => ({ x: Math.cos(a) * r * (s / 5), y: Math.sin(a) * r * (s / 5) + s * s * 1.2, o: s > 4 ? 0.3 : 1 })), 800);
    }
    return;
  }
  // sparkle: 6 percikan memancar keluar
  for (let i = 0; i < 6; i++) {
    const el = node(i % 2 === 0 ? SPARKLE_BURST_2 : SPARKLE_BURST_1, 3, x - 13, y - 13);
    const a = (i / 6) * Math.PI * 2;
    if (el !== null) play(el, [0, 1, 2, 3, 4].map((s) => ({ x: Math.cos(a) * 9 * s, y: Math.sin(a) * 9 * s, o: s > 3 ? 0.3 : 1 })), 520);
  }
}

export function cartBump(): void {
  const t = document.querySelector<HTMLElement>(TARGET);
  if (t === null) return;
  for (const [el, cls] of [[t, "fx-bump"], [t.querySelector<HTMLElement>(".cart-badge"), "fx-pop"]] as const) {
    if (el === null) continue;
    el.classList.remove(cls);
    void el.offsetWidth; // restart animasi
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), 600);
  }
}

// Roti melengkung dari tombol ke ikon keranjang ([data-cart-target]), lalu keranjang "mantul".
export function flyToCart(from: HTMLElement, sprite: Sprite = CROISSANT): void {
  if (!canAnimate()) return;
  const target = document.querySelector<HTMLElement>(TARGET);
  if (target === null) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const sx = a.left + a.width / 2;
  const sy = a.top + a.height / 2;
  const dx = b.left + b.width / 2 - sx;
  const dy = b.top + b.height / 2 - sy;
  const el = node(sprite, 2, sx - 24, sy - 24);
  if (el === null) return;
  const steps = 14;
  const frames = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return { x: dx * t, y: dy * t - Math.sin(Math.PI * t) * 90, o: t > 0.92 ? 0 : 1 };
  });
  const anim = el.animate(frames.map((f, i) => ({ transform: `translate(${Math.round(f.x)}px, ${Math.round(f.y)}px) scale(${1 - (i / steps) * 0.5})`, opacity: f.o, offset: i / steps, easing: "steps(1, end)" })), { duration: 700, fill: "forwards" });
  const done = () => {
    release(el);
    cartBump();
    burstAt(b.left + b.width / 2, b.top + b.height / 2, "sparkle");
  };
  anim.onfinish = done;
  anim.oncancel = () => release(el);
}
