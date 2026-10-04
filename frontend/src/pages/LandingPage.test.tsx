import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LandingPage } from "./LandingPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("LandingPage", () => {
  it("tanpa fetch menu: hero + CTA ke /menu", async () => {
    const spy = vi.fn(async (_url: string) => new Response(JSON.stringify({ status: "success", data: [] })));
    vi.stubGlobal("fetch", spy);
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: /sweet that loves/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lihat menu/i })).toHaveAttribute("href", "/menu");
    expect(screen.getByRole("link", { name: /fun fact/i })).toHaveAttribute("href", "/funfact");
    expect(screen.queryByRole("link", { name: /jelajahi kategori/i })).toBeNull();
    const urls = spy.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("/categories") || (u.includes("/products") && !u.includes("/recommendations")))).toBe(false);
  });

  it("ada post baru -> section Terbaru tampil (maks 3)", async () => {
    const posts = [1, 2, 3, 4].map((n) => ({ id: `p${n}`, title: `Post ${n}`, body: "Isi.", tag: "News", product_id: null, created_at: "2026-10-03T00:00:00Z" }));
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/trending") || u.includes("/recommendations")) return new Response(JSON.stringify({ status: "success", data: [] }));
      if (u.includes("/preferences")) return new Response(JSON.stringify({ status: "success", data: { need: "diet" } }));
      return new Response(JSON.stringify({ status: "success", data: posts }));
    }));
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(await screen.findByText("Post 1")).toBeInTheDocument();
    expect(screen.getByText("Post 3")).toBeInTheDocument();
    expect(screen.queryByText("Post 4")).toBeNull();
    expect(screen.getByRole("link", { name: /lihat semua post/i })).toHaveAttribute("href", "/funfact");
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
      if (u.includes("/preferences")) return new Response(JSON.stringify({ status: "success", data: { need: "diet" } }));
      if (u.includes("/recommendations")) return new Response(JSON.stringify({ status: "success", data: recs }));
      return new Response(JSON.stringify({ status: "success", data: [] }));
    }));
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(await screen.findByText("Salad")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /kebutuhan/i })).toBeNull();
  });

  it("submit popup simpan via PUT /preferences", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      const m = String(init?.method ?? "GET");
      calls.push({ url: u, method: m });
      if (u.includes("/preferences") && m !== "GET") return new Response(JSON.stringify({ status: "success", data: { need: "diet" } }));
      return new Response(JSON.stringify({ status: "success", data: u.includes("/preferences") ? null : [] }));
    }));
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    await screen.findByRole("dialog", { name: /kebutuhan/i });
    fireEvent.click(screen.getByRole("button", { name: /^simpan$/i }));
    await vi.waitFor(() => {
      expect(calls.some((c) => c.url.includes("/preferences") && c.method === "PUT")).toBe(true);
    });
  });
});
