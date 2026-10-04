import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { LanguageToggle } from "./LanguageToggle.tsx";
import { SoundToggle } from "./SoundToggle.tsx";
import { getLang, setLang } from "../i18n/store.ts";
import { isSoundOn, setSoundOn } from "../fx/sound.ts";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.dataset.theme = "";
  setLang("id");
  setSoundOn(false);
});
afterEach(() => {
  cleanup();
  window.localStorage.clear();
  document.documentElement.dataset.theme = "";
  setLang("id");
  setSoundOn(false);
});

describe("ThemeToggle (siang/malam)", () => {
  it("tampil siang: tombol aria-pressed=false, label Indonesia, teks SIANG", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: "Ganti ke mode gelap" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveTextContent("SIANG");
  });

  it("klik -> malam: data-theme dark, persist, label & teks berganti; klik lagi kembali siang", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button", { name: "Ganti ke mode gelap" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("serenity-theme")).toBe("dark");
    const night = screen.getByRole("button", { name: "Ganti ke mode terang" });
    expect(night).toHaveAttribute("aria-pressed", "true");
    expect(night).toHaveTextContent("MALAM");
    await user.click(night);
    expect(document.documentElement.dataset.theme).toBe("");
    expect(window.localStorage.getItem("serenity-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Ganti ke mode gelap" })).toHaveAttribute("aria-pressed", "false");
  });

  it("memulihkan tema gelap dari localStorage", () => {
    window.localStorage.setItem("serenity-theme", "dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Ganti ke mode terang" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("bahasa Inggris: label dan teks DAY/NIGHT", async () => {
    const user = userEvent.setup();
    setLang("en");
    render(<ThemeToggle />);
    const btn = screen.getByRole("button", { name: "Switch to dark mode" });
    expect(btn).toHaveTextContent("DAY");
    await user.click(btn);
    const night = screen.getByRole("button", { name: "Switch to light mode" });
    expect(night).toHaveTextContent("NIGHT");
  });
});

describe("LanguageToggle (ID | EN)", () => {
  it("grup berlabel dengan dua tombol; ID aktif secara default", () => {
    render(<LanguageToggle />);
    const group = screen.getByRole("group", { name: "Bahasa" });
    expect(group).toBeInTheDocument();
    const id = screen.getByRole("button", { name: "Bahasa Indonesia" });
    const en = screen.getByRole("button", { name: "English" });
    expect(id).toHaveTextContent("ID");
    expect(en).toHaveTextContent("EN");
    expect(id).toHaveAttribute("aria-pressed", "true");
    expect(en).toHaveAttribute("aria-pressed", "false");
    expect(id).toHaveAttribute("lang", "id");
    expect(en).toHaveAttribute("lang", "en");
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("klik EN -> bahasa en, tersimpan, label grup berubah; klik ID kembali", async () => {
    const user = userEvent.setup();
    render(<LanguageToggle />);
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(getLang()).toBe("en");
    expect(window.localStorage.getItem("serenity-lang")).toBe("en");
    expect(document.documentElement.lang).toBe("en");
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Bahasa Indonesia" })).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByRole("button", { name: "Bahasa Indonesia" }));
    expect(getLang()).toBe("id");
    expect(window.localStorage.getItem("serenity-lang")).toBe("id");
  });

  it("dapat dioperasikan dengan keyboard (Tab lalu Enter/Spasi)", async () => {
    const user = userEvent.setup();
    render(<LanguageToggle />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Bahasa Indonesia" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "English" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(getLang()).toBe("en");
    await user.tab({ shift: true });
    await user.keyboard(" ");
    expect(getLang()).toBe("id");
  });
});

describe("SoundToggle", () => {
  it("default mati: label Suara mati, aria-pressed=false", () => {
    render(<SoundToggle />);
    const btn = screen.getByRole("button", { name: "Suara mati" });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveClass("sound-toggle--header");
  });

  it("klik menyalakan dan mematikan suara + persist", async () => {
    const user = userEvent.setup();
    render(<SoundToggle />);
    await user.click(screen.getByRole("button", { name: "Suara mati" }));
    expect(isSoundOn()).toBe(true);
    expect(window.localStorage.getItem("serenity-sound")).toBe("on");
    const on = screen.getByRole("button", { name: "Suara aktif" });
    expect(on).toHaveAttribute("aria-pressed", "true");
    await user.click(on);
    expect(isSoundOn()).toBe(false);
    expect(screen.getByRole("button", { name: "Suara mati" })).toBeInTheDocument();
  });

  it("instans footer memakai kelas footer dan label Inggris", () => {
    setLang("en");
    render(<SoundToggle where="footer" />);
    const btn = screen.getByRole("button", { name: "Sound off" });
    expect(btn).toHaveClass("sound-toggle--footer");
  });
});
