import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { SafeImage } from "./SafeImage.tsx";

afterEach(() => cleanup());

describe("SafeImage", () => {
  it("menampilkan <img> bila URL ada", () => {
    render(<SafeImage src="https://img/x.jpg" alt="Promo" className="photo" />);
    expect(screen.getByRole("img", { name: "Promo" })).toHaveAttribute("src", "https://img/x.jpg");
  });

  it("gagal dimuat -> placeholder dengan label 'No image for now' (gambar besar)", () => {
    render(<SafeImage src="https://img/hilang.jpg" alt="Promo" className="photo" label />);
    fireEvent.error(screen.getByRole("img", { name: "Promo" }));
    const stage = screen.getByRole("img", { name: /gambar|image/i });
    expect(stage.className).toContain("product-photo--empty");
    expect(stage.querySelector(".no-image")).not.toBeNull();
  });

  it("tanpa URL & tanpa label -> panggung dekoratif (aria-hidden) memakai emptyClassName", () => {
    const { container } = render(<SafeImage src={null} alt="" className="mini-photo" emptyClassName="mini-photo mini-photo--empty" />);
    const div = container.firstElementChild as HTMLElement;
    expect(div.tagName).toBe("DIV");
    expect(div.getAttribute("aria-hidden")).toBe("true");
    expect(div.className).toContain("mini-photo--empty");
    expect(container.querySelector("img")).toBeNull();
  });
});
