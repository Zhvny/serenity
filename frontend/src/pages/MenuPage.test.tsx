import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { MenuPage } from "./MenuPage.tsx";
import { setLang } from "../i18n/store.ts";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); setLang("id"); });
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
    expect(await screen.findByRole("link", { name: "Salad" })).toBeInTheDocument();
  });
  it("kategori kosong → chip Semua tetap ada", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({ status: "success", data: String(url).includes("/categories") ? [] : prods }))));
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    expect(await screen.findByRole("button", { name: "Semua" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Salad" })).toBeInTheDocument();
  });
  it("filter cepat beruntun → hasil terakhir menang", async () => {
    mockOk();
    const user = userEvent.setup();
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    await screen.findByRole("link", { name: "Salad" });
    await user.click(screen.getByRole("button", { name: "Makanan Sehat" }));
    await user.click(screen.getByRole("button", { name: "Semua" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Salad" })).toBeInTheDocument());
  });
  it("produk kosong → Belum ada menu + reset tampilkan list", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({ status: "success", data: String(url).includes("/categories") ? cats : [] }))));
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    expect(await screen.findByRole("status")).toHaveTextContent("Belum ada menu");
    mockOk();
    await user.click(screen.getByRole("button", { name: "Tampilkan semua" }));
    expect(await screen.findByRole("link", { name: "Salad" })).toBeInTheDocument();
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
    await screen.findByRole("link", { name: "Salad" });
    await user.click(screen.getByRole("button", { name: "Makanan Sehat" }));
    await waitFor(() => expect(urls.some((u) => u.includes("category=cat_food"))).toBe(true));
  });

  it("bahasa Indonesia (default) → teks hero, papan, dan aria-label Indonesia", async () => {
    mockOk();
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    await screen.findByRole("link", { name: "Salad" });
    expect(screen.getByRole("link", { name: "Lihat Menu" })).toBeInTheDocument();
    expect(screen.getByText("Pilihan hari ini")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Spesial hari ini: Salad" })).toBeInTheDocument();
    expect(screen.getByText("1 kkal · 1 g protein")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Elus kucing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Colek roti tawar" })).toBeInTheDocument();
  });
  it("bahasa Inggris → hero, papan, chip, kartu, kucing, dan rak roti berbahasa Inggris", async () => {
    setLang("en");
    mockOk();
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    await screen.findByRole("link", { name: "Salad" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sweet treats that love you back.");
    expect(screen.getByRole("link", { name: "See the menu" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse categories" })).toBeInTheDocument();
    expect(screen.getByText("Today's picks")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Today's special: Salad" })).toBeInTheDocument();
    expect(screen.getByText("Today's special")).toBeInTheDocument();
    expect(screen.getByText("1 kcal · 1 g protein")).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Filter menu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Healthy Meals" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "No image for now" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pet the cat" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Pastries on the shelf" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Poke the bread loaf" })).toBeInTheDocument();
  });
  it("bahasa Inggris → loading, error, dan kosong", async () => {
    setLang("en");
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    const { unmount } = render(<MemoryRouter><MenuPage /></MemoryRouter>);
    expect(screen.getByText("Baking the menu…")).toBeInTheDocument();
    unmount();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the menu");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    cleanup();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({ status: "success", data: String(url).includes("/categories") ? cats : [] }))));
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    expect(await screen.findByRole("status")).toHaveTextContent("No menu yet");
    mockOk();
    await user.click(screen.getByRole("button", { name: "Show all" }));
    expect(await screen.findByRole("link", { name: "Salad" })).toBeInTheDocument();
  });
  it("ganti bahasa saat halaman terbuka → teks ikut berganti", async () => {
    mockOk();
    render(<MemoryRouter><MenuPage /></MemoryRouter>);
    await screen.findByRole("link", { name: "Salad" });
    expect(screen.getByRole("button", { name: "Semua" })).toBeInTheDocument();
    act(() => setLang("en"));
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Semua" })).toBeNull();
  });
});
