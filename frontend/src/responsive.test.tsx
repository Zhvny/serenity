import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { MenuPage } from "./pages/MenuPage.tsx";
import { CartPage } from "./pages/CartPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const cats = [{ id: "cat_food", name: "Makanan Sehat", description: null }];
const prods = [{ id: "p1", name: "Salad", category_id: "cat_food", price: 10000, tags: [], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, fiber_g: 1, sugar_g: 1 }, allergens: [] }];
const cart = [{ item_id: "it1", product_id: "p1", quantity: 2, note: "tanpa es" }];

describe("responsive tokens", () => {
  it("menu grid memakai class token .grid-menu (bukan .product-grid)", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({ status: "success", data: String(url).includes("/categories") ? cats : prods }))));
    const { container } = render(<MemoryRouter><MenuPage /></MemoryRouter>);
    await screen.findByRole("link", { name: "Salad" });
    expect(container.querySelector(".grid-menu")).not.toBeNull();
    expect(container.querySelector(".product-grid")).toBeNull();
  });

  it("CartPage memakai struktur class token (.cart-row) tanpa inline style sage", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({ status: "success", data: String(url).includes("/cart") ? cart : prods }))));
    const { container } = render(<MemoryRouter><CartPage /></MemoryRouter>);
    await screen.findByText("Salad");
    expect(container.querySelector(".cart-row")).not.toBeNull();
    // Tidak boleh ada inline style warna sage lama (#7A8F6E) — harus via class token.
    const inlineSage = Array.from(container.querySelectorAll("[style]")).filter((el) => (el.getAttribute("style") ?? "").replace(/\s/g, "").toLowerCase().includes("7a8f6e"));
    expect(inlineSage).toHaveLength(0);
  });
});
