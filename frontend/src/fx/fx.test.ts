import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { burstAt, cartBump, flyToCart } from "./fx.ts";
import { isSoundOn, playSound, setSoundOn } from "./sound.ts";

type FakeAnim = { onfinish: null | (() => void); oncancel: null | (() => void) };

function stubAnimate(): FakeAnim[] {
  const anims: FakeAnim[] = [];
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    value: () => {
      const a: FakeAnim = { onfinish: null, oncancel: null };
      anims.push(a);
      return a;
    },
  });
  return anims;
}

beforeEach(() => {
  document.body.innerHTML = "";
});
afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error — lepas stub animate agar tes lain melihat lingkungan jsdom polos
  delete Element.prototype.animate;
  window.localStorage.clear();
});

describe("suara", () => {
  it("default mati; menyalakan disimpan di localStorage dan mengirim event", () => {
    expect(isSoundOn()).toBe(false);
    const seen = vi.fn();
    window.addEventListener("serenity:sound", seen);
    setSoundOn(true);
    expect(isSoundOn()).toBe(true);
    expect(window.localStorage.getItem("serenity-sound")).toBe("on");
    expect(seen).toHaveBeenCalled();
    setSoundOn(false);
    expect(window.localStorage.getItem("serenity-sound")).toBe("off");
    window.removeEventListener("serenity:sound", seen);
  });

  it("playSound aman dipanggil tanpa AudioContext (jsdom) saat mati maupun hidup", () => {
    expect(() => playSound("ding")).not.toThrow();
    setSoundOn(true);
    expect(() => playSound("meow")).not.toThrow();
    setSoundOn(false);
  });
});

describe("efek partikel", () => {
  it("no-op tanpa Element.animate (jsdom): tidak membuat lapisan", () => {
    burstAt(10, 10, "sparkle");
    expect(document.querySelector(".fx-layer")).toBeNull();
  });

  it("no-op saat prefers-reduced-motion", () => {
    stubAnimate();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    burstAt(10, 10, "hearts");
    expect(document.querySelector(".fx-layer")).toBeNull();
  });

  it("burst membuat partikel (maks 24) dan membersihkannya saat animasi selesai", () => {
    const anims = stubAnimate();
    burstAt(50, 50, "confetti");
    burstAt(50, 50, "confetti");
    burstAt(50, 50, "crumbs");
    const layer = document.querySelector(".fx-layer");
    expect(layer).not.toBeNull();
    expect(layer?.getAttribute("aria-hidden")).toBe("true");
    const n = layer?.querySelectorAll(".fx-particle").length ?? 0;
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(24);
    anims.forEach((a) => a.onfinish?.());
    expect(layer?.querySelectorAll(".fx-particle").length).toBe(0);
    // setelah bersih, bisa spawn lagi
    burstAt(5, 5, "sparkle");
    expect(document.querySelectorAll(".fx-particle").length).toBeGreaterThan(0);
  });

  it("cartBump menambah kelas fx-bump pada target keranjang dan fx-pop pada badge", () => {
    document.body.innerHTML = '<a data-cart-target><span class="cart-badge">1</span></a>';
    cartBump();
    expect(document.querySelector("[data-cart-target]")?.classList.contains("fx-bump")).toBe(true);
    expect(document.querySelector(".cart-badge")?.classList.contains("fx-pop")).toBe(true);
  });

  it("flyToCart: no-op tanpa target; dengan target membuat 1 roti terbang lalu mantulkan keranjang", () => {
    const anims = stubAnimate();
    const from = document.createElement("button");
    document.body.appendChild(from);
    flyToCart(from);
    expect(document.querySelector(".fx-particle")).toBeNull(); // tak ada [data-cart-target]
    document.body.insertAdjacentHTML("beforeend", '<a data-cart-target><span class="cart-badge">0</span></a>');
    flyToCart(from);
    expect(document.querySelectorAll(".fx-particle").length).toBe(1);
    anims[0]?.onfinish?.();
    expect(document.querySelector("[data-cart-target]")?.classList.contains("fx-bump")).toBe(true);
  });
});
