import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Footer } from "./Footer.tsx";

afterEach(() => cleanup());

describe("Footer", () => {
  it("tautan Menu & Keranjang mengarah ke /menu & /cart, tanpa kolom kategori", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Menu" })).toHaveAttribute("href", "/menu");
    expect(screen.getByRole("link", { name: "Keranjang" })).toHaveAttribute("href", "/cart");
    expect(screen.queryByRole("navigation", { name: "Kategori" })).toBeNull();
  });
});
