import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LandingPage } from "./LandingPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("LandingPage", () => {
  it("tanpa fetch menu: hero + CTA ke /menu", async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ status: "success", data: [] })));
    vi.stubGlobal("fetch", spy);
    render(<MemoryRouter><LandingPage /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: /sweet that loves/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lihat menu/i })).toHaveAttribute("href", "/menu");
    const urls = spy.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("/categories") || u.includes("/products"))).toBe(false);
  });
});
