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
    render(<MemoryRouter><LandingCard variant="product" id="p1" title="Salad" price={45000} /></MemoryRouter>);
    expect(screen.getByText(/45\.000/)).toBeTruthy();
  });
});
