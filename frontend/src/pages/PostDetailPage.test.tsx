import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { PostDetailPage } from "./PostDetailPage.tsx";
import { setLang } from "../i18n/store.ts";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); setLang("id"); });

function resp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const post = {
  id: "post-1", title: "Promo", body: "Isi promo lengkap.", tag: "News",
  product_id: null, image_url: "https://img/x.jpg", product_ids: ["prod_001"],
  created_at: "2026-10-03T00:00:00Z",
  products: [{ id: "prod_001", name: "Choco Lava", price: 30000, image_url: null }],
};

describe("PostDetailPage", () => {
  it("tampil gambar + body + produk saran", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: post })));
    render(
      <MemoryRouter initialEntries={["/posts/post-1"]}>
        <Routes><Route path="/posts/:id" element={<PostDetailPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Promo" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Promo" })).toHaveAttribute("src", "https://img/x.jpg");
    expect(screen.getByText("Isi promo lengkap.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Choco Lava" });
    expect(link).toHaveAttribute("href", "/products/prod_001");
  });

  it("unknown -> tidak ditemukan + kembali", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "error", code: "POST_NOT_FOUND", message: "x" }, 404)));
    render(
      <MemoryRouter initialEntries={["/posts/nope"]}>
        <Routes><Route path="/posts/:id" element={<PostDetailPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/tidak ditemukan/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /fun fact/i })).toBeInTheDocument();
  });

  it("lang en -> tidak ditemukan Inggris + produk saran Inggris", async () => {
    setLang("en");
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: post })));
    render(
      <MemoryRouter initialEntries={["/posts/post-1"]}>
        <Routes><Route path="/posts/:id" element={<PostDetailPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("region", { name: /suggested products/i })).toBeInTheDocument();
    expect(screen.getByText(/serenity products/i)).toBeInTheDocument();
  });
  it("lang en -> judul/isi/posting Inggris + nama produk Inggris", async () => {
    setLang("en");
    const enPost = { ...post, title_en: "Promo EN", body_en: "Full content.", excerpt_en: null, products: [{ id: "prod_001", name: "Choco Lava", name_en: "Choco Lava EN", price: 30000, image_url: null }] };
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: enPost })));
    render(
      <MemoryRouter initialEntries={["/posts/post-1"]}>
        <Routes><Route path="/posts/:id" element={<PostDetailPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Promo EN" })).toBeInTheDocument();
    expect(screen.getByText("Full content.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Choco Lava EN" })).toBeInTheDocument();
  });
});
