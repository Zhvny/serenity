import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { CartPage } from "./CartPage.tsx";
import { setLang } from "../i18n/store.ts";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); setLang("id"); });

const p1 = { id: "p1", name: "Salad", category_id: "cat_food", price: 10000, tags: [], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, fiber_g: 1, sugar_g: 1 }, allergens: [] as string[] };
const p2 = { id: "p2", name: "Jus", category_id: "cat_drink", price: 20000, tags: [], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, fiber_g: 1, sugar_g: 1 }, allergens: [] as string[] };
const items = [
  { item_id: "i1", product_id: "p1", quantity: 2, note: null },
  { item_id: "i2", product_id: "p2", quantity: 1, note: "tanpa gula" },
];

function stubCart() {
  const calls: Array<{ url: string; method: string; body: string | undefined }> = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    const method = init?.method ?? "GET";
    calls.push({ url: u, method, body: init?.body as string | undefined });
    if (u.includes("/cart/checkout")) return new Response(JSON.stringify({ status: "success", data: { mode: "instant", items } }));
    if (u.includes("/cart/items/i1") && method === "PUT") {
      const b = JSON.parse(String(init?.body)) as { quantity: number };
      return new Response(JSON.stringify({ status: "success", data: { ...items[0], quantity: b.quantity } }));
    }
    if (u.includes("/cart/items/") && method === "DELETE") return new Response(JSON.stringify({ status: "success", data: { removed: true } }));
    if (u.includes("/products")) return new Response(JSON.stringify({ status: "success", data: [p1, p2] }));
    if (u.includes("/cart")) return new Response(JSON.stringify({ status: "success", data: items }));
    return new Response(JSON.stringify({ status: "error", code: "X", message: "unknown" }), { status: 500 });
  }));
  return calls;
}

describe("CartPage", () => {
  it("list 2 item + total benar", async () => {
    stubCart();
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    expect(await screen.findByText("Salad")).toBeInTheDocument();
    expect(screen.getByText("Jus")).toBeInTheDocument();
    expect(screen.getAllByText("Rp 40.000")).toHaveLength(2);
  });
  it("klik + → PUT terkirim + qty naik", async () => {
    const user = userEvent.setup();
    const calls = stubCart();
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    await screen.findByText("Salad");
    await user.click(screen.getByRole("button", { name: "Tambah Salad" }));
    expect(await screen.findAllByText("Rp 50.000")).toHaveLength(2);
    const put = calls.find((c) => c.method === "PUT");
    expect(put?.url).toContain("/cart/items/i1");
    expect(put?.body).toContain("3");
  });
  it("klik X → item hilang", async () => {
    const user = userEvent.setup();
    stubCart();
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    await screen.findByText("Salad");
    await user.click(screen.getByRole("button", { name: "Hapus Salad" }));
    expect(screen.queryByText("Salad")).not.toBeInTheDocument();
  });
  it("checkout instant valid → POST /cart/checkout + navigate /checkout", async () => {
    const user = userEvent.setup();
    const calls = stubCart();
    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<div>Halaman Pembayaran</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("Salad");
    await user.click(screen.getByRole("button", { name: "Lanjut ke Pembayaran" }));
    expect(await screen.findByText("Halaman Pembayaran")).toBeInTheDocument();
    const post = calls.find((c) => c.url.includes("/cart/checkout"));
    expect(post?.body).toContain('"instant"');
  });
  it("klik + gagal → error tampil + qty tetap", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      const method = init?.method ?? "GET";
      if (u.includes("/cart/items/i1") && method === "PUT") {
        return new Response(JSON.stringify({ status: "error", code: "X", message: "Gagal simpan" }), { status: 500 });
      }
      if (u.includes("/products")) return new Response(JSON.stringify({ status: "success", data: [p1, p2] }));
      return new Response(JSON.stringify({ status: "success", data: items }));
    }));
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    await screen.findByText("Salad");
    await user.click(screen.getByRole("button", { name: "Tambah Salad" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal simpan");
    expect(screen.getByLabelText("Jumlah Salad")).toHaveValue(2);
  });
  it("ketik qty via keyboard + Enter → PUT terkirim dengan nilai diketik (clamp 10)", async () => {
    const user = userEvent.setup();
    const calls = stubCart();
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    await screen.findByText("Salad");
    const input = screen.getByLabelText("Jumlah Salad");
    await user.clear(input);
    await user.type(input, "4{Enter}");
    const put = calls.find((c) => c.method === "PUT" && c.url.includes("/cart/items/i1"));
    expect(put?.body).toContain("4");
  });
  it('note "" tak tampil', async () => {
    const noNote = [{ ...items[0], note: "" }];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/products")) return new Response(JSON.stringify({ status: "success", data: [p1, p2] }));
      return new Response(JSON.stringify({ status: "success", data: noNote }));
    }));
    const { container } = render(<MemoryRouter><CartPage /></MemoryRouter>);
    await screen.findByText("Salad");
    expect(container.querySelector("li p[style]")).toBeNull();
  });
  it("retry sukses → pesan error basi hilang", async () => {
    const user = userEvent.setup();
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      n += 1;
      const u = String(url);
      if (n <= 2) return new Response(JSON.stringify({ status: "error", code: "X", message: "Server mati" }), { status: 500 });
      if (u.includes("/products")) return new Response(JSON.stringify({ status: "success", data: [p1, p2] }));
      return new Response(JSON.stringify({ status: "success", data: items }));
    }));
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    expect(await screen.findByText("Server mati")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(await screen.findByText("Salad")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("toggle Diantar → textarea + warning tampil; Ambil sendiri → sembunyi", async () => {
    const user = userEvent.setup();
    stubCart();
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    await screen.findByText("Salad");
    expect(screen.queryByLabelText("Alamat pengiriman")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Diantar" }));
    expect(screen.getByLabelText("Alamat pengiriman")).toBeInTheDocument();
    expect(screen.getByText(/Biaya pengiriman mengikuti harga Gosend/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ambil sendiri" }));
    expect(screen.queryByLabelText("Alamat pengiriman")).toBeNull();
  });
  it("submit Diantar kirim delivery_method + address", async () => {
    const user = userEvent.setup();
    const calls = stubCart();
    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<div>Halaman Pembayaran</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("Salad");
    await user.click(screen.getByRole("button", { name: "Diantar" }));
    await user.type(screen.getByLabelText("Alamat pengiriman"), "Jl. Sehat No. 10 Jakarta");
    await user.click(screen.getByRole("button", { name: "Lanjut ke Pembayaran" }));
    expect(await screen.findByText("Halaman Pembayaran")).toBeInTheDocument();
    const post = calls.find((c) => c.url.includes("/cart/checkout"));
    expect(post?.body).toContain('"delivery"');
    expect(post?.body).toContain("Jl. Sehat No. 10 Jakarta");
  });
  it("submit Ambil sendiri kirim address null", async () => {
    const user = userEvent.setup();
    const calls = stubCart();
    render(
      <MemoryRouter initialEntries={["/cart"]}>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<div>Halaman Pembayaran</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText("Salad");
    await user.click(screen.getByRole("button", { name: "Lanjut ke Pembayaran" }));
    expect(await screen.findByText("Halaman Pembayaran")).toBeInTheDocument();
    const post = calls.find((c) => c.url.includes("/cart/checkout"));
    expect(post?.body).toContain("null");
  });
  it("address <10 char → error inline, POST tak terkirim", async () => {
    const user = userEvent.setup();
    const calls = stubCart();
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    await screen.findByText("Salad");
    await user.click(screen.getByRole("button", { name: "Diantar" }));
    await user.type(screen.getByLabelText("Alamat pengiriman"), "jl a");
    await user.click(screen.getByRole("button", { name: "Lanjut ke Pembayaran" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("minimal 10 karakter");
    expect(calls.find((c) => c.url.includes("/cart/checkout"))).toBeUndefined();
  });
});

describe("CartPage (English)", () => {
  it("judul, struk, ringkasan, aria-label qty, chip & tombol checkout dalam bahasa Inggris", async () => {
    setLang("en");
    stubCart();
    const { container } = render(<MemoryRouter><CartPage /></MemoryRouter>);
    await screen.findByText("Salad");
    expect(screen.getByRole("heading", { level: 1, name: "Your cart" })).toBeInTheDocument();
    expect(container.querySelector(".receipt-title")).toHaveTextContent("ORDER RECEIPT");
    expect(screen.getByRole("heading", { name: "Summary" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase Salad" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decrease Salad" })).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity of Salad")).toHaveValue(2);
    expect(screen.getByRole("button", { name: "Remove Salad" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pick up" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeInTheDocument();
    expect(screen.queryByText("Ringkasan")).toBeNull();
  });
  it("Delivery -> label alamat + validasi (Inggris); slot waktu 12 jam", async () => {
    setLang("en");
    const user = userEvent.setup();
    const calls = stubCart();
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    await screen.findByText("Salad");
    await user.click(screen.getByRole("button", { name: "Scheduled" }));
    expect(screen.getByRole("button", { name: "12:00 PM" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "6:00 PM" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Instant" }));
    await user.click(screen.getByRole("button", { name: "Delivery" }));
    await user.type(screen.getByLabelText("Delivery address"), "jl a");
    await user.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("at least 10 characters");
    expect(calls.find((c) => c.url.includes("/cart/checkout"))).toBeUndefined();
  });
  it("keranjang kosong -> pesan Inggris", async () => {
    setLang("en");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify({ status: "success", data: String(url).includes("/products") ? [p1, p2] : [] }))));
    render(<MemoryRouter><CartPage /></MemoryRouter>);
    expect(await screen.findByText("Your cart is empty")).toBeInTheDocument();
  });
});
