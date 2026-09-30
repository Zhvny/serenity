import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { MenuPage } from "./MenuPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const cats = [{ id: "cat_food", name: "Makanan Sehat", description: null }];
const prods = [{ id: "p1", name: "Salad", category_id: "cat_food", price: 10000, tags: [], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, fiber_g: 1, sugar_g: 1 }, allergens: [] }];

function mockOk() {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({ status: "success", data: String(url).includes("/categories") ? cats : prods }))));
}

describe("MenuPage", () => {
  it("error backend → pesan + Coba lagi", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "error", code: "X", message: "Rusak" }), { status: 500 })));
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    expect(await screen.findByRole("button", { name: "Coba lagi" })).toBeInTheDocument();
  });
  it("klik Coba lagi → fetch ulang dan tampil", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "error", code: "X", message: "Rusak" }), { status: 500 })));
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    await screen.findByRole("button", { name: "Coba lagi" });
    mockOk();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(await screen.findByText("Salad")).toBeInTheDocument();
  });
  it("kategori kosong → chip Semua tetap ada", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({ status: "success", data: String(url).includes("/categories") ? [] : prods }))));
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    expect(await screen.findByRole("button", { name: "Semua" })).toBeInTheDocument();
    expect(await screen.findByText("Salad")).toBeInTheDocument();
  });
  it("filter cepat beruntun → hasil terakhir menang", async () => {
    mockOk();
    const user = userEvent.setup();
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    await screen.findByText("Salad");
    await user.click(screen.getByRole("button", { name: "Makanan Sehat" }));
    await user.click(screen.getByRole("button", { name: "Semua" }));
    await waitFor(() => expect(screen.getByText("Salad")).toBeInTheDocument());
  });
  it("produk kosong → Belum ada menu + reset tampilkan list", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({ status: "success", data: String(url).includes("/categories") ? cats : [] }))));
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    expect(await screen.findByRole("status")).toHaveTextContent("Belum ada menu");
    mockOk();
    await user.click(screen.getByRole("button", { name: "Tampilkan semua" }));
    expect(await screen.findByText("Salad")).toBeInTheDocument();
  });
  it("loading → 6 skeleton", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    const { container } = render(<MemoryRouter><MenuPage /></MemoryRouter>);
    expect(container.querySelectorAll(".skeleton")).toHaveLength(6);
  });
  it("klik chip kategori → fetch mengandung category=cat_food", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      urls.push(String(url));
      return new Response(JSON.stringify({ status: "success", data: String(url).includes("/categories") ? cats : prods }));
    }));
    const user = userEvent.setup();
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    await screen.findByText("Salad");
    await user.click(screen.getByRole("button", { name: "Makanan Sehat" }));
    await waitFor(() => expect(urls.some((u) => u.includes("category=cat_food"))).toBe(true));
  });
});
