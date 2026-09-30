import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ProductCard } from "./ProductCard.tsx";
import type { Product } from "../services/api.ts";

const product: Product = { id: "prod_001", name: "Salad Quinoa", category_id: "cat_food", price: 45000, tags: ["high-protein"], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 320, protein_g: 28, carbs_g: 22, fat_g: 12, fiber_g: 6, sugar_g: 4 }, allergens: [] };

describe("ProductCard", () => {
  it("tampilkan nama, harga Rp, tag", () => {
    render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
    expect(screen.getByText("Salad Quinoa")).toBeInTheDocument();
    expect(screen.getByText("Rp 45.000")).toBeInTheDocument();
    expect(screen.getByText("high-protein")).toBeInTheDocument();
  });
  it("image null → placeholder, bukan img rusak", () => {
    const { container } = render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".product-photo--empty")).not.toBeNull();
  });
});
