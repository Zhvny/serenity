import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router";
import { DetailPage } from "./DetailPage.tsx";
import { MenuPage } from "./MenuPage.tsx";
import { setLang } from "../i18n/store.ts";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); setLang("id"); });
const prod = { id: "p1", name: "Salad", category_id: "cat_food", price: 10000, tags: ["vegan"], image_url: null, description: "Segar.", description_en: "Fresh.", name_en: "Salad EN", is_active: true, nutrition: { calories_kcal: 100, protein_g: 10, carbs_g: 5, fat_g: 3, fiber_g: 2, sugar_g: 1 }, allergens: ["kacang"] };

function renderId(id: string) {
  render(<MemoryRouter initialEntries={[`/products/${id}`]}><Routes><Route path="/products/:id" element={<DetailPage />} /></Routes></MemoryRouter>);
}

describe("DetailPage", () => {
  it("id unknown → tidak-ketemu + kembali", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "error", code: "PRODUCT_NOT_FOUND", message: "Tidak ada" }), { status: 404 })));
    renderId("nope");
    expect(await screen.findByText("Produk tidak ditemukan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kembali ke Menu" })).toBeInTheDocument();
  });
  it("tambah keranjang → success", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const data = String(url).includes("/cart/add") ? { item_id: "i1", product_id: "p1", quantity: 1, note: null } : prod;
      return new Response(JSON.stringify({ status: "success", data }));
    }));
    renderId("p1");
    await screen.findByText("Salad");
    await user.click(screen.getByRole("button", { name: "Tambahkan ke Keranjang" }));
    expect(await screen.findByText("Ditambahkan ke keranjang")).toBeInTheDocument();
  });
  it("tambah keranjang gagal → pesan error tampil", async () => {    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/cart/add")) {
        return new Response(JSON.stringify({ status: "error", code: "CART_FULL", message: "Keranjang penuh" }), { status: 500 });
      }
      return new Response(JSON.stringify({ status: "success", data: prod }));
    }));
    renderId("p1");
    await screen.findByText("Salad");
    await user.click(screen.getByRole("button", { name: "Tambahkan ke Keranjang" }));
    expect(await screen.findByText("Keranjang penuh")).toBeInTheDocument();
  });
  it("lang en -> nama + deskripsi Inggris", async () => {
    setLang("en");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "success", data: prod }))));
    renderId("p1");
    expect(await screen.findByRole("heading", { name: "Salad EN" })).toBeInTheDocument();
    expect(screen.getByText("Fresh.")).toBeInTheDocument();
  });
});

describe("DetailPage (English)", () => {
  it("label nutrisi, alergen, tombol & pesan sukses tampil dalam bahasa Inggris", async () => {
    setLang("en");
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const data = String(url).includes("/cart/add") ? { item_id: "i1", product_id: "p1", quantity: 1, note: null } : prod;
      return new Response(JSON.stringify({ status: "success", data }));
    }));
    renderId("p1");
    await screen.findByText("Salad EN");
    expect(screen.getByRole("heading", { name: "Nutrition facts" })).toBeInTheDocument();
    expect(screen.getByText("Calories")).toBeInTheDocument();
    expect(screen.getByText("kcal")).toBeInTheDocument();
    expect(screen.getByText("Carbs")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Allergens" })).toBeInTheDocument();
    expect(screen.getByText("Peanuts")).toBeInTheDocument();
    expect(screen.queryByText("Informasi nutrisi")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(await screen.findByText("Added to cart")).toBeInTheDocument();
  });
  it("id unknown -> pesan tidak-ketemu dalam bahasa Inggris", async () => {
    setLang("en");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "error", code: "PRODUCT_NOT_FOUND", message: "x" }), { status: 404 })));
    renderId("nope");
    expect(await screen.findByText("Product not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Menu" })).toBeInTheDocument();
  });
});

describe("MenuPage sinkron URL", () => {
  it("/?category=cat_food → fetch mengandung category=cat_food + chip aktif", async () => {
    const cats = [{ id: "cat_food", name: "Makanan Sehat", description: null }];
    const prods = [{ id: "p1", name: "Salad", category_id: "cat_food", price: 10000, tags: [], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, fiber_g: 1, sugar_g: 1 }, allergens: [] }];
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      urls.push(String(url));
      return new Response(JSON.stringify({ status: "success", data: String(url).includes("/categories") ? cats : prods }));
    }));
    render(<MemoryRouter initialEntries={["/?category=cat_food"]}><MenuPage /></MemoryRouter>);
    await screen.findByRole("link", { name: "Salad" });
    await waitFor(() => expect(urls.some((u) => u.includes("category=cat_food"))).toBe(true));
    expect(screen.getByRole("button", { name: "Makanan Sehat" })).toHaveAttribute("aria-pressed", "true");
  });
  it("klik chip kategori → URL mengandung ?category=", async () => {
    const cats = [{ id: "cat_food", name: "Makanan Sehat", description: null }];
    const prods = [{ id: "p1", name: "Salad", category_id: "cat_food", price: 10000, tags: [], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, fiber_g: 1, sugar_g: 1 }, allergens: [] }];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({ status: "success", data: String(url).includes("/categories") ? cats : prods }))));
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/"]}><MenuPage /><LocationProbe /></MemoryRouter>);
    await screen.findByRole("link", { name: "Salad" });
    await user.click(screen.getByRole("button", { name: "Makanan Sehat" }));
    expect(await screen.findByTestId("loc")).toHaveTextContent("/?category=cat_food");
  });
});

function LocationProbe() {
  const loc = useLocation();
  return <p data-testid="loc">{loc.pathname}{loc.search}</p>;
}
