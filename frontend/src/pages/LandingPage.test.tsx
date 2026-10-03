import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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
    expect(urls.some((u) => u.includes("/categories") || u.includes("/products"))).toBe(false);
  });

  it("ada post baru -> section Terbaru tampil (maks 3)", async () => {
    const posts = [1, 2, 3, 4].map((n) => ({ id: `p${n}`, title: `Post ${n}`, body: "Isi.", tag: "News", product_id: null, created_at: "2026-10-03T00:00:00Z" }));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "success", data: posts }))));
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(await screen.findByText("Post 1")).toBeInTheDocument();
    expect(screen.getByText("Post 3")).toBeInTheDocument();
    expect(screen.queryByText("Post 4")).toBeNull();
    expect(screen.getByRole("link", { name: /lihat semua post/i })).toHaveAttribute("href", "/funfact");
  });
});
