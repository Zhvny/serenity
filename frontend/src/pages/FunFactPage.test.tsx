import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { FunFactPage } from "./FunFactPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("FunFactPage", () => {
  it("render di /funfact: judul + card + tag", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "success", data: [] }))));
    render(
      <MemoryRouter initialEntries={["/funfact"]}>
        <Routes><Route path="/funfact" element={<FunFactPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: /fun fact/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /beranda/i })).toHaveAttribute("href", "/");
    expect(screen.getByText("Kenapa beli Serenity?")).toBeInTheDocument();
    expect(screen.getByText("Dessert sehat bukan mitos")).toBeInTheDocument();
    expect(screen.getByText("Pre-order = lebih segar")).toBeInTheDocument();
  });

  it("ada post DB -> tampil post DB (bukan fallback)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "success", data: [{ id: "p1", title: "Promo Akhir Tahun", body: "Diskon.", tag: "News", product_id: null, created_at: "2026-10-03T00:00:00Z" }] }))));
    render(
      <MemoryRouter initialEntries={["/funfact"]}>
        <Routes><Route path="/funfact" element={<FunFactPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Promo Akhir Tahun")).toBeInTheDocument();
    expect(screen.queryByText("Dessert sehat bukan mitos")).toBeNull();
  });
});
