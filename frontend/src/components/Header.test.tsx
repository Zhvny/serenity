import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Header } from "./Header.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function resp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

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

  it("toggle tema -> dark + persist localStorage", async () => {
    const user = userEvent.setup();
    window.localStorage.clear();
    document.documentElement.dataset.theme = "";
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: [] })));
    render(<MemoryRouter><Header /></MemoryRouter>);
    const btn = await screen.findByRole("button", { name: /mode gelap/i });
    await user.click(btn);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem("serenity-theme")).toBe("dark");
    expect(await screen.findByRole("button", { name: /mode terang/i })).toBeInTheDocument();
    window.localStorage.clear();
    document.documentElement.dataset.theme = "";
  });

  it("kategori aktif -> aria-current page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: [] })));
    render(
      <MemoryRouter initialEntries={["/?category=cat_food"]}>
        <Header categories={[{ id: "cat_food", name: "Makanan" }, { id: "cat_drink", name: "Minuman" }]} />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("link", { name: "Makanan" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Minuman" })).not.toHaveAttribute("aria-current");
  });
});
