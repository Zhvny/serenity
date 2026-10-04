import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LandingPage } from "./LandingPage.tsx";
import { setLang } from "../i18n/store.ts";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); setLang("id"); });

describe("LandingPage", () => {
  it("tanpa fetch menu: hero + CTA ke /menu", async () => {
    const spy = vi.fn(async (_url: string) => new Response(JSON.stringify({ status: "success", data: [] })));
    vi.stubGlobal("fetch", spy);
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: /manis yang menyayangi/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lihat menu/i })).toHaveAttribute("href", "/menu");
    expect(screen.getByRole("link", { name: /fun fact/i })).toHaveAttribute("href", "/funfact");
    expect(screen.queryByRole("link", { name: /jelajahi kategori/i })).toBeNull();
    const urls = spy.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("/categories") || (u.includes("/products") && !u.includes("/recommendations")))).toBe(false);
  });

  it("preferensi kosong -> popup kebutuhan muncul sekali", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/preferences")) return new Response(JSON.stringify({ status: "success", data: null }));
      return new Response(JSON.stringify({ status: "success", data: [] }));
    }));
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(await screen.findByRole("dialog", { name: /kebutuhan/i })).toBeInTheDocument();
  });

  it("preferensi ada -> popup tak muncul + rekomendasi tampil", async () => {
    const recs = [{ id: "prod_001", name: "Salad", category_id: "cat_food", price: 45000, tags: [], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 320, protein_g: 28, carbs_g: 22, fat_g: 12, fiber_g: 6, sugar_g: 4 }, allergens: [] }];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/preferences")) return new Response(JSON.stringify({ status: "success", data: { needs: ["diet"] } }));
      if (u.includes("/recommendations")) return new Response(JSON.stringify({ status: "success", data: recs }));
      return new Response(JSON.stringify({ status: "success", data: [] }));
    }));
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(await screen.findByText("Salad")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /kebutuhan/i })).toBeNull();
    expect(screen.queryByRole("group", { name: /pilih kebutuhan/i })).toBeNull();
  });

  it("submit popup multi-need via PUT /preferences {needs}", async () => {
    const calls: Array<{ url: string; method: string; body: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      const m = String(init?.method ?? "GET");
      const b = String(init?.body ?? "");
      calls.push({ url: u, method: m, body: b });
      if (u.includes("/preferences") && m !== "GET") return new Response(JSON.stringify({ status: "success", data: { needs: ["diet", "muscle"] } }));
      return new Response(JSON.stringify({ status: "success", data: u.includes("/preferences") ? null : [] }));
    }));
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    await screen.findByRole("dialog", { name: /kebutuhan/i });
    fireEvent.click(screen.getByRole("checkbox", { name: "Diet" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Bentuk otot" }));
    fireEvent.click(screen.getByRole("button", { name: /^simpan$/i }));
    await vi.waitFor(() => {
      const put = calls.find((c) => c.url.includes("/preferences") && c.method === "PUT");
      expect(put?.body).toContain('"diet"');
      expect(put?.body).toContain('"muscle"');
    });
  });

  it("lang en -> hero + section Inggris penuh", async () => {
    setLang("en");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/preferences")) return new Response(JSON.stringify({ status: "success", data: null }));
      return new Response(JSON.stringify({ status: "success", data: [] }));
    }));
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: /sweet that loves/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see the menu/i })).toHaveAttribute("href", "/menu");
    expect(await screen.findByRole("dialog", { name: /what do you need/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Build muscle" })).toBeInTheDocument();
  });

  it("section post di bawah rekomendasi pakai trending", async () => {
    const posts = [1, 2, 3].map((n) => ({ id: `t${n}`, title: `Tren ${n}`, body: "Isi.", excerpt: "", tag: "FunFact", product_id: null, created_at: "2026-10-04T00:00:00Z" }));
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/trending")) return new Response(JSON.stringify({ status: "success", data: posts }));
      if (u.includes("/preferences")) return new Response(JSON.stringify({ status: "success", data: { needs: ["diet"] } }));
      return new Response(JSON.stringify({ status: "success", data: [] }));
    }));
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    const sec = await screen.findByRole("region", { name: /bacaan pilihan/i });
    expect(sec).toBeInTheDocument();
    expect(await screen.findByText("Tren 1")).toBeInTheDocument();
  });
});
