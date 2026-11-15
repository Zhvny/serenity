import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CheckoutPage } from "./CheckoutPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers(); });

// Widget Turnstile palsu: render langsung memanggil callback dengan token uji.
function stubTurnstile(token = "tok-uji"): void {
  vi.stubGlobal("turnstile", {
    render: (_el: unknown, opts: { callback: (t: string) => void }) => { opts.callback(token); return "w1"; },
    reset: vi.fn(),
    remove: vi.fn(),
  });
}

function resp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// fetch palsu: GET keranjang/produk -> satu item; selainnya diserahkan ke handler uji.
function withCart(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (init?.method === undefined || init.method === "GET") {
      if (u.includes("/cart")) return resp({ status: "success", data: [{ item_id: "i1", product_id: "p1", quantity: 2, note: null }] });
      if (u.includes("/products")) return resp({ status: "success", data: [{ id: "p1", name: "Roti Uji", name_en: "Test Bread", price: 15000, category_id: "c", tags: [], image_url: null, description: null, description_en: null, source: "t", is_active: true, nutrition: {}, allergens: [] }] });
    }
    return handler(url, init);
  });
}

describe("CheckoutPage", () => {
  it("ringkasan pesanan: item, jumlah, dan total tampil", async () => {
    vi.stubGlobal("fetch", withCart(async () => resp({ status: "success", data: [] })));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(screen.getByText(/2× Roti Uji/)).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?30\.000/, { selector: "strong" })).toBeInTheDocument();
  });
  it("keranjang kosong -> pesan + tautan menu, tanpa form bayar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: [] })));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(screen.getByRole("heading", { name: /keranjang kosong/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bayar/i })).toBeNull();
    expect(screen.getByRole("link", { name: /lihat menu/i })).toHaveAttribute("href", "/menu");
  });
  it("angka detik berdetak tiap detik sampai checkbox aktif", async () => {
    vi.stubGlobal("fetch", withCart(async () => resp({ status: "success", data: [] })));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    expect(screen.getByText(/\(bisa dicentang dalam 5 dtk\)/)).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByText(/\(bisa dicentang dalam 4 dtk\)/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(screen.getByRole("checkbox")).toBeEnabled();
  });
  it("bayar + checkbox terkunci sampai jeda baca selesai", async () => {
    vi.stubGlobal("fetch", withCart(async () => resp({ status: "success", data: [] })));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /bayar/i })).toBeDisabled();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByRole("checkbox")).toBeEnabled();
    expect(screen.getByRole("button", { name: /bayar/i })).toBeDisabled();
  });

  it("tanpa centang -> tetap disabled; centang -> kirim donation_consent true", async () => {
    stubTurnstile();
    const bodies: Array<string | undefined> = [];
    vi.stubGlobal("fetch", withCart(async (_url: string, init?: RequestInit) => {
      bodies.push(init?.body as string | undefined);
      return resp({ status: "success", data: { order_id: "HP-1", unique_code: "ORD-1", qr_url: "https://qr?ref=ORD-1", nominal: 90000 } });
    }));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole("button", { name: /bayar/i })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /bayar/i })).toBeEnabled();
    let changed = 0;
    window.addEventListener("cart:changed", () => { changed += 1; });
    fireEvent.click(screen.getByRole("button", { name: /bayar/i }));
    await vi.waitFor(() => expect(bodies.some((b) => b !== undefined && b.includes('"donation_consent":true'))).toBe(true));
    await vi.waitFor(() => expect(changed).toBe(1));
  });

  it("body kirim turnstile_token + honeypot kosong", async () => {
    stubTurnstile("tok-abc");
    const bodies: Array<string | undefined> = [];
    vi.stubGlobal("fetch", withCart(async (_url: string, init?: RequestInit) => {
      bodies.push(init?.body as string | undefined);
      return resp({ status: "success", data: { order_id: "HP-1", unique_code: "ORD-1", qr_url: "https://qr?ref=ORD-1", nominal: 90000 } });
    }));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await act(async () => { vi.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /bayar/i }));
    await vi.waitFor(() => expect(bodies.some((b) =>
      b !== undefined && b.includes('"turnstile_token":"tok-abc"') && b.includes('"website":""'))).toBe(true));
  });

  it("klik Bayar beruntun hanya membuat SATU pesanan", async () => {
    stubTurnstile();
    let calls = 0;
    vi.stubGlobal("fetch", withCart(async () => {
      calls += 1;
      return resp({ status: "success", data: { order_id: "HP-1", unique_code: "ORD-1", qr_url: "q", nominal: 30000 } });
    }));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    fireEvent.click(screen.getByRole("checkbox"));
    const pay = screen.getByRole("button", { name: /bayar via qris/i });
    fireEvent.click(pay);
    fireEvent.click(pay);
    fireEvent.click(pay);
    await act(async () => { await vi.advanceTimersByTimeAsync(50); });
    expect(calls).toBe(1);
  });

  it("tanpa widget (token kosong) -> tombol tetap disabled walau sudah centang", async () => {
    vi.stubGlobal("fetch", withCart(async () => resp({ status: "success", data: [] })));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await act(async () => { vi.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /bayar/i })).toBeDisabled();
  });

  it("script tak termuat 10 dtk -> pesan pemblokir", async () => {
    vi.stubGlobal("fetch", withCart(async () => resp({ status: "success", data: [] })));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.getByRole("alert")).toHaveTextContent(/pemblokir/i);
  });

  it("403 TURNSTILE_FAILED -> pesan arahan Riwayat", async () => {
    stubTurnstile();
    vi.stubGlobal("fetch", withCart(async () =>
      resp({ status: "error", code: "TURNSTILE_FAILED", message: "Verifikasi gagal" }, 403)));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await act(async () => { vi.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /bayar/i }));
    await vi.waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Riwayat/));
  });
});
