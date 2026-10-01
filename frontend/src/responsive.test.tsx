import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { MenuPage } from "./pages/MenuPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const cats = [{ id: "cat_food", name: "Makanan Sehat", description: null }];
const prods = [{ id: "p1", name: "Salad", category_id: "cat_food", price: 10000, tags: [], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, fiber_g: 1, sugar_g: 1 }, allergens: [] }];

describe("responsive tokens", () => {
  it("menu grid memakai class token .grid-menu (bukan .product-grid)", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({ status: "success", data: String(url).includes("/categories") ? cats : prods }))));
    const { container } = render(<MemoryRouter><MenuPage /></MemoryRouter>);
    await screen.findByText("Salad");
    expect(container.querySelector(".grid-menu")).not.toBeNull();
    expect(container.querySelector(".product-grid")).toBeNull();
  });
});
