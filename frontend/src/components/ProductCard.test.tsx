import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ProductCard } from "./ProductCard.tsx";
import type { Product } from "../services/api.ts";
import { setLang } from "../i18n/store.ts";

afterEach(() => { cleanup(); setLang("id"); });

const product: Product = { id: "prod_001", name: "Salad Quinoa", category_id: "cat_food", price: 45000, tags: ["high-protein"], image_url: null, description: null, name_en: null, description_en: null, is_active: true, nutrition: { calories_kcal: 320, protein_g: 28, carbs_g: 22, fat_g: 12, fiber_g: 6, sugar_g: 4 }, allergens: [] };

describe("ProductCard", () => {
  it("tampilkan nama, harga Rp, tag", () => {
    render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
    expect(screen.getByText("Salad Quinoa")).toBeInTheDocument();
    expect(screen.getByText("Rp 45.000")).toBeInTheDocument();
    expect(screen.getByText("high-protein")).toBeInTheDocument();
  });
  it("image null → placeholder id/en, bukan img rusak", () => {
    const { container } = render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".product-photo--empty")).not.toBeNull();
    expect(container.querySelector(".no-image")?.textContent).toBe("Belum ada gambar");
  });
  it("lang en -> nama Inggris; name_en null -> fallback Indonesia", () => {
    setLang("en");
    render(<MemoryRouter><ProductCard product={{ ...product, name_en: "Quinoa Salad" }} /></MemoryRouter>);
    expect(screen.getByText("Quinoa Salad")).toBeInTheDocument();
    cleanup();
    render(<MemoryRouter><ProductCard product={{ ...product, name_en: null }} /></MemoryRouter>);
    expect(screen.getByText("Salad Quinoa")).toBeInTheDocument();
  });
  it("bahasa Inggris → label placeholder \"No image for now\", nama ikut bahasa", () => {
    setLang("en");
    render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
    expect(screen.getByRole("img", { name: "No image for now" })).toBeInTheDocument();
    expect(screen.getByText("high-protein")).toBeInTheDocument();
    expect(screen.getByText("Rp 45.000")).toBeInTheDocument();
  });
});
