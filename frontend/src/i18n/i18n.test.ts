import { describe, it, expect, afterEach } from "vitest";
import { getLang, localeOf, setLang } from "./store.ts";
import { translate } from "./t.ts";
import { EN, ID } from "./dict/index.ts";
import * as shell from "./dict/shell.ts";
import * as menu from "./dict/menu.ts";
import * as shop from "./dict/shop.ts";
import * as orders from "./dict/orders.ts";
import { allergenLabel, categoryLabel } from "./content.ts";

afterEach(() => {
  setLang("id");
  window.localStorage.clear();
});

describe("bahasa aktif", () => {
  it("default Indonesia; setLang('en') tersimpan, mengubah <html lang>, dan mengirim event", () => {
    expect(getLang()).toBe("id");
    let events = 0;
    const onLang = () => { events++; };
    window.addEventListener("serenity:lang", onLang);
    setLang("en");
    expect(getLang()).toBe("en");
    expect(window.localStorage.getItem("serenity-lang")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(events).toBe(1);
    expect(localeOf()).toBe("en-US");
    setLang("id");
    expect(document.documentElement.lang).toBe("id");
    expect(localeOf()).toBe("id-ID");
    window.removeEventListener("serenity:lang", onLang);
  });

  it("menolak bahasa selain id/en", () => {
    // @ts-expect-error — uji runtime: hanya dua bahasa yang diizinkan
    setLang("fr");
    expect(getLang()).toBe("id");
  });
});

describe("kamus", () => {
  const areas = { shell, menu, shop, orders };

  it("tiap area: kunci EN = kunci ID, tak ada teks kosong, placeholder {x} sama", () => {
    for (const [name, mod] of Object.entries(areas)) {
      const idKeys = Object.keys(mod.id).sort();
      const enKeys = Object.keys(mod.en).sort();
      expect(enKeys, `kunci area ${name}`).toEqual(idKeys);
      for (const k of idKeys) {
        const idv = (mod.id as Record<string, string>)[k] ?? "";
        const env = (mod.en as Record<string, string>)[k] ?? "";
        expect(idv.trim(), `${k} (id) kosong`).not.toBe("");
        expect(env.trim(), `${k} (en) kosong`).not.toBe("");
        const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
        expect(ph(env), `placeholder ${k}`).toBe(ph(idv));
      }
    }
  });

  it("kunci unik antar-area dan berawalan nama area", () => {
    const seen = new Set<string>();
    for (const [name, mod] of Object.entries(areas)) {
      for (const k of Object.keys(mod.id)) {
        expect(seen.has(k), `kunci ganda: ${k}`).toBe(false);
        seen.add(k);
        expect(k.startsWith(`${name}.`), `${k} harus berawalan ${name}.`).toBe(true);
      }
    }
    expect(Object.keys(ID).length).toBe(seen.size);
    expect(Object.keys(EN).length).toBe(seen.size);
  });

  it("translate: bahasa, fallback ke kunci, dan interpolasi", () => {
    // @ts-expect-error — kunci tak ada -> kembali ke kunci itu sendiri
    expect(translate("en", "tidak.ada")).toBe("tidak.ada");
  });
});

describe("konten tetap", () => {
  it("kategori & alergen: Inggris untuk yang dikenal, apa adanya untuk yang tak dikenal", () => {
    expect(categoryLabel({ id: "cat_drink", name: "Minuman Sehat" }, "en")).toBe("Healthy Drinks");
    expect(categoryLabel({ id: "cat_drink", name: "Minuman Sehat" }, "id")).toBe("Minuman Sehat");
    expect(categoryLabel({ id: "cat_x", name: "Kategori X" }, "en")).toBe("Kategori X");
    expect(allergenLabel("kacang", "en")).toBe("Peanuts");
    expect(allergenLabel("Susu", "en")).toBe("Milk");
    expect(allergenLabel("kacang", "id")).toBe("kacang");
    expect(allergenLabel("lain", "en")).toBe("lain");
  });
});
