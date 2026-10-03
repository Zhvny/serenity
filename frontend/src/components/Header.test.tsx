import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Header } from "./Header.tsx";
import { Footer } from "./Footer.tsx";
import { setLang } from "../i18n/store.ts";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); setLang("id"); window.localStorage.clear(); });

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

describe("Header i18n + aksi", () => {
  const cats = [{ id: "cat_food", name: "Makanan Sehat" }, { id: "cat_drink", name: "Minuman Sehat" }];
  const emptyCart = () => vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: [] })));

  it("Indonesia: landmark, Riwayat, Keranjang, dan tiga tombol aksi ada", async () => {
    emptyCart();
    render(<MemoryRouter><Header categories={cats} /></MemoryRouter>);
    expect(screen.getByRole("navigation", { name: "Kategori" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Riwayat" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Keranjang" })).toHaveAttribute("data-cart-target");
    expect(screen.getByRole("group", { name: "Bahasa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /suara mati/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ganti ke mode gelap" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Makanan Sehat" })).toBeInTheDocument();
  });

  it("klik EN mengganti semua teks header ke Inggris (kategori lewat categoryLabel)", async () => {
    const user = userEvent.setup();
    emptyCart();
    render(<MemoryRouter><Header categories={cats} /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("navigation", { name: "Categories" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cart" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sound off" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Healthy Meals" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Healthy Drinks" })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
    await user.click(screen.getByRole("button", { name: "Bahasa Indonesia" }));
    expect(screen.getByRole("link", { name: "Makanan Sehat" })).toBeInTheDocument();
  });

  it("bahasa tersimpan dipakai saat render berikutnya", () => {
    emptyCart();
    setLang("en");
    render(<MemoryRouter><Header categories={cats} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
  });
});

describe("Footer i18n", () => {
  const cats = [{ id: "cat_dessert", name: "Dessert Sehat" }];
  it("Indonesia: teks asli + tombol suara footer", () => {
    render(<MemoryRouter><Footer categories={cats} /></MemoryRouter>);
    expect(screen.getByText(/Pre-order dessert & minuman sehat rendah gula/)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Tautan" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jelajah" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Keranjang" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dessert Sehat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suara mati" })).toHaveClass("sound-toggle--footer");
  });
  it("Inggris: teks, tautan dan kategori diterjemahkan", () => {
    setLang("en");
    render(<MemoryRouter><Footer categories={cats} /></MemoryRouter>);
    expect(screen.getByRole("navigation", { name: "Links" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Explore" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cart" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Healthy Desserts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sound off" })).toBeInTheDocument();
  });
});
