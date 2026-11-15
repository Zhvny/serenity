import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { FaqPage } from "./FaqPage.tsx";
import { setLang } from "../i18n/store.ts";
import { ID, EN } from "../i18n/dict/index.ts";

afterEach(() => { cleanup(); setLang("id"); document.title = ""; });

describe("FaqPage", () => {
  it("9 pertanyaan, jawaban terbuka saat diklik, judul tab, tautan ke menu", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><FaqPage /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1, name: "Tanya jawab" })).toBeInTheDocument();
    expect(document.title).toBe("Tanya jawab · Serenity");
    const items = document.querySelectorAll("details.faq-item");
    expect(items).toHaveLength(9);
    const first = items[0] as HTMLDetailsElement;
    expect(first.open).toBe(false);
    await user.click(within(first as HTMLElement).getByText("Bagaimana cara memesan?"));
    expect(first.open).toBe(true);
    expect(screen.getByRole("link", { name: "Lihat menu" })).toHaveAttribute("href", "/menu#menu");
    expect(document.querySelector("main#main")).not.toBeNull();
  });
  it("Inggris: pertanyaan dan jawaban diterjemahkan, tanpa sisa kunci mentah", () => {
    setLang("en");
    render(<MemoryRouter><FaqPage /></MemoryRouter>);
    expect(screen.getByText("How do I order?")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/faq\./);
  });
  it("kamus: setiap kunci faq punya padanan ID dan EN yang tidak kosong", () => {
    const keys = Object.keys(ID).filter((k) => k.startsWith("faq."));
    expect(keys.length).toBeGreaterThanOrEqual(20);
    for (const k of keys) {
      expect((ID as Record<string, string>)[k]).not.toBe("");
      expect((EN as Record<string, string>)[k]).not.toBe("");
    }
  });
});
