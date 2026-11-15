import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ThanksPage } from "./ThanksPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function resp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("ThanksPage", () => {
  it("ref tak valid -> 404 pesan tidak ditemukan", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "error", code: "NOT_FOUND", message: "Tidak ditemukan" }, 404)));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-X"]}><ThanksPage /></MemoryRouter>);
    expect(await screen.findByText(/tidak ditemukan/i)).toBeInTheDocument();
  });

  it("ref valid -> tampil nominal + QR", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { unique_code: "ORD-ABC", nominal: 90000, qr_url: "https://qr.example?ref=ORD-ABC", status: "pending_payment" } })));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-ABC"]}><ThanksPage /></MemoryRouter>);
    expect(await screen.findByText(/ORD-ABC/)).toBeInTheDocument();
    expect(screen.getAllByText(/90.?000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("img", { name: /qris|qr/i })).toBeInTheDocument();
  });

  it("tautan Lacak pesanan + Riwayat + Salin kode tampil, dan catatan kedaluwarsa", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { unique_code: "ORD-ABC", nominal: 90000, qr_url: "https://qr.example?ref=ORD-ABC", status: "pending_payment" } })));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-ABC"]}><ThanksPage /></MemoryRouter>);
    expect(await screen.findByRole("link", { name: "Lacak pesanan" })).toHaveAttribute("href", "/status/ORD-ABC");
    expect(screen.getByRole("link", { name: "Riwayat pesanan" })).toHaveAttribute("href", "/riwayat");
    expect(screen.getByRole("button", { name: "Salin kode" })).toBeInTheDocument();
    expect(screen.getByText(/kedaluwarsa otomatis sekitar 2 jam/i)).toBeInTheDocument();
  });

  it("gambar QR gagal dimuat -> pesan + tombol muat ulang (bukan celah kosong)", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { unique_code: "ORD-ABC", nominal: 90000, qr_url: "https://qr.example?ref=ORD-ABC", status: "pending_payment" } })));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-ABC"]}><ThanksPage /></MemoryRouter>);
    const img = await screen.findByRole("img", { name: /qris|qr/i });
    fireEvent.error(img);
    expect(await screen.findByText(/QR belum bisa dimuat/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Muat ulang QR" }));
    expect(screen.getByRole("img", { name: /qris|qr/i }).getAttribute("src")).toContain("r=1");
  });

  it("gangguan jaringan TIDAK mengganti halaman jadi 'tidak ditemukan' (tampil 'mencoba lagi')", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down"); }));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-ABC"]}><ThanksPage /></MemoryRouter>);
    expect(await screen.findByText(/Koneksi terputus/)).toBeInTheDocument();
    expect(screen.queryByText(/tidak ditemukan/i)).toBeNull();
  });

  it("link tak berlaku -> petunjuk perangkat + tombol Riwayat", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "error", code: "NOT_FOUND", message: "Tidak ditemukan" }, 404)));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-X"]}><ThanksPage /></MemoryRouter>);
    expect(await screen.findByText(/hanya terlihat di perangkat/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka Riwayat" })).toHaveAttribute("href", "/riwayat");
  });

  it("underpaid -> Kurang + Bayar kekurangan -> ref anak", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/topup")) return resp({ status: "success", data: { order_id: "HP-C", unique_code: "ORD-CHILD", qr_url: "q", nominal: 20000 } });
      if (u.includes("ref=ORD-CHILD")) return resp({ status: "success", data: { unique_code: "ORD-CHILD", nominal: 20000, paid_amount: null, qr_url: "q", status: "pending_payment" } });
      return resp({ status: "success", data: { unique_code: "ORD-U", nominal: 90000, paid_amount: 70000, qr_url: "q", status: "underpaid" } });
    }));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-U"]}><ThanksPage /></MemoryRouter>);
    expect(await screen.findByText(/Kurang Rp/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /bayar kekurangan/i }));
    expect(await screen.findByText(/ORD-CHILD/)).toBeInTheDocument();
  });
});
