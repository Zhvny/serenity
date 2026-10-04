import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { FunFactPage } from "./FunFactPage.tsx";
import { setLang } from "../i18n/store.ts";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); setLang("id"); });

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
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "success", data: [{ id: "p1", title: "Promo Akhir Tahun", body: "Diskon.", excerpt: null, tag: "News", product_id: null, created_at: "2026-10-03T00:00:00Z" }] }))));
    render(
      <MemoryRouter initialEntries={["/funfact"]}>
        <Routes><Route path="/funfact" element={<FunFactPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Promo Akhir Tahun")).toBeInTheDocument();
    expect(screen.queryByText("Dessert sehat bukan mitos")).toBeNull();
  });

  it("excerpt diutamakan di kartu (bukan potongan body)", async () => {
    const longBody = "B".repeat(200);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "success", data: [{ id: "p2", title: "Riset Gula", body: longBody, excerpt: "Ringkasan riset.", tag: "Research", product_id: null, created_at: "2026-10-03T00:00:00Z" }] }))));
    render(
      <MemoryRouter initialEntries={["/funfact"]}>
        <Routes><Route path="/funfact" element={<FunFactPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Ringkasan riset.")).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(`B{120}`))).toBeNull();
  });

  it("lang en -> judul + fallback Inggris", async () => {
    setLang("en");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "success", data: [] }))));
    render(
      <MemoryRouter initialEntries={["/funfact"]}>
        <Routes><Route path="/funfact" element={<FunFactPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: /fun facts & news/i })).toBeInTheDocument();
    expect(screen.getByText("Why buy Serenity?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /home/i })).toHaveAttribute("href", "/");
  });
});
