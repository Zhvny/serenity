import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LandingCard } from "./LandingCard.tsx";

describe("LandingCard", () => {
  it("varian post tampilkan tag + judul", () => {
    render(<MemoryRouter><LandingCard variant="post" id="1" title="Fakta Gula" tag="FunFact" excerpt="manis" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Fakta Gula" })).toHaveAttribute("href", "/posts/1");
  });
  it("varian product tampilkan harga", () => {
    render(<MemoryRouter><LandingCard variant="product" id="p1" title="Salad" price={45000} image_url={null} category_id="cat_food" /></MemoryRouter>);
    expect(screen.getByText(/45\.000/)).toBeTruthy();
  });
  it("product ber-gambar -> img; tanpa gambar -> placeholder", () => {
    const { container, unmount } = render(<MemoryRouter><LandingCard variant="product" id="p1" title="Salad" price={45000} image_url="/images/p1.jpg" category_id="cat_food" /></MemoryRouter>);
    expect(container.querySelector("img")).toHaveAttribute("src", "/images/p1.jpg");
    unmount();
    const empty = render(<MemoryRouter><LandingCard variant="product" id="p2" title="Teh" price={10000} image_url={null} category_id="cat_drink" /></MemoryRouter>);
    expect(empty.container.querySelector("img")).toBeNull();
    expect(empty.container.querySelector(".product-photo--empty")).not.toBeNull();
  });
  it("post ber-gambar -> img; tanpa gambar -> placeholder teks", () => {
    const { container, unmount } = render(<MemoryRouter><LandingCard variant="post" id="1" title="T" tag="News" excerpt="e" image_url="/images/x.jpg" /></MemoryRouter>);
    expect(container.querySelector("img")).toHaveAttribute("src", "/images/x.jpg");
    unmount();
    const empty = render(<MemoryRouter><LandingCard variant="post" id="2" title="U" tag="News" excerpt="e" image_url={null} /></MemoryRouter>);
    expect(empty.container.querySelector("img")).toBeNull();
    expect(empty.container.querySelector(".fact-photo--empty")).not.toBeNull();
  });
});
