import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Header } from "./Header.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("Header badge", () => {
  it("tampil jumlah Σ qty dari GET /cart", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "success", data: [
      { item_id: "i1", product_id: "p1", quantity: 2, note: null },
      { item_id: "i2", product_id: "p2", quantity: 3, note: null },
    ] }))));
    render(<MemoryRouter><Header /></MemoryRouter>);
    expect(await screen.findByText("5")).toBeInTheDocument();
  });
  it("GET /cart gagal → badge disembunyikan", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("down"); }));
    const { container } = render(<MemoryRouter><Header /></MemoryRouter>);
    await waitFor(() => expect(container.querySelector(".cart-badge")).toBeNull());
  });
});
