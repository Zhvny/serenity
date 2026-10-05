import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Footer } from "./Footer.tsx";

afterEach(() => cleanup());

describe("Footer", () => {
  it("tautan Menu & kategori mengarah ke /menu (beranda '/' adalah landing)", () => {
    render(
      <MemoryRouter>
        <Footer categories={[{ id: "cat_food", name: "Makanan Sehat" }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Menu" })).toHaveAttribute("href", "/menu");
    expect(screen.getByRole("link", { name: "Makanan Sehat" })).toHaveAttribute("href", "/menu?category=cat_food");
    expect(screen.getByRole("link", { name: "Keranjang" })).toHaveAttribute("href", "/cart");
  });
});
