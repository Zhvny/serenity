import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { StatusPage } from "./StatusPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function resp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("StatusPage polling", () => {
  it("status paid -> tampil konfirmasi dibayar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { unique_code: "ORD-1", nominal: 1000, qr_url: null, status: "paid" } })));
    render(
      <MemoryRouter initialEntries={["/status/ORD-1"]}>
        <Routes><Route path="/status/:code" element={<StatusPage />} /></Routes>
      </MemoryRouter>,
    );
    expect((await screen.findAllByText(/dibayar|lunas/i)).length).toBeGreaterThanOrEqual(1);
  });

  it("menunggu pembayaran -> penjelasan + tombol Bayar sekarang ke halaman QR", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { unique_code: "ORD-1", nominal: 1000, qr_url: "q", status: "pending_payment" } })));
    render(<MemoryRouter initialEntries={["/status/ORD-1"]}><Routes><Route path="/status/:code" element={<StatusPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/status berubah sendiri/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bayar sekarang" })).toHaveAttribute("href", "/thanks?ref=ORD-1");
    expect(screen.getByRole("link", { name: "Riwayat pesanan" })).toHaveAttribute("href", "/riwayat");
  });
  it("sedang disiapkan -> stepper tahap 'Disiapkan' aktif (bukan 'Menunggu pembayaran')", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { unique_code: "ORD-1", nominal: 1000, qr_url: null, status: "preparing" } })));
    render(<MemoryRouter initialEntries={["/status/ORD-1"]}><Routes><Route path="/status/:code" element={<StatusPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Sedang disiapkan")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Tahap pesanan" });
    const current = list.querySelector('[aria-current="step"]');
    expect(current).toHaveTextContent("Disiapkan");
    expect(list.querySelectorAll("li.is-done")).toHaveLength(1);
    expect(screen.queryByText("Menunggu pembayaran")).toBeNull();
    expect(screen.queryByRole("link", { name: "Bayar sekarang" })).toBeNull();
  });
  it("kedaluwarsa -> label kedaluwarsa, tanpa stepper", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { unique_code: "ORD-1", nominal: 1000, qr_url: null, status: "expired" } })));
    render(<MemoryRouter initialEntries={["/status/ORD-1"]}><Routes><Route path="/status/:code" element={<StatusPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Kedaluwarsa")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Tahap pesanan" })).toBeNull();
  });
  it("menunggu pembayaran -> tanpa stepper", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { unique_code: "ORD-1", nominal: 1000, qr_url: "q", status: "pending_payment" } })));
    render(<MemoryRouter initialEntries={["/status/ORD-1"]}><Routes><Route path="/status/:code" element={<StatusPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Menunggu pembayaran")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Tahap pesanan" })).toBeNull();
  });
  it("gangguan jaringan -> pesan 'mencoba lagi' (bukan halaman kosong) dan bukan 'tidak ditemukan'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down"); }));
    render(<MemoryRouter initialEntries={["/status/ORD-1"]}><Routes><Route path="/status/:code" element={<StatusPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(/Koneksi terputus/)).toBeInTheDocument();
    expect(screen.queryByText(/tidak ditemukan/i)).toBeNull();
  });
  it("ref/code tidak ada order -> 404 tidak ditemukan", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "error", code: "NOT_FOUND", message: "Tidak ditemukan" }, 404)));
    render(
      <MemoryRouter initialEntries={["/status/ORD-X"]}>
        <Routes><Route path="/status/:code" element={<StatusPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/tidak ditemukan/i)).toBeInTheDocument();
  });

  it("underpaid -> Kurang bayar + sisa + tombol top-up", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (String(url).includes("/topup")) return resp({ status: "success", data: { order_id: "HP-C", unique_code: "ORD-C", qr_url: "q", nominal: 20000 } });
      return resp({ status: "success", data: { unique_code: "ORD-U", nominal: 90000, paid_amount: 70000, qr_url: null, status: "underpaid" } });
    }));
    render(
      <MemoryRouter initialEntries={["/status/ORD-U"]}>
        <Routes>
          <Route path="/status/:code" element={<StatusPage />} />
          <Route path="/thanks" element={<div>THANKS</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/kurang bayar/i)).toBeInTheDocument();
    expect(screen.getByText(/Kurang Rp/)).toBeInTheDocument();
  });
});
