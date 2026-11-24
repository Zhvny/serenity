import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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

  it("ref valid -> tampil nominal + info transfer rekening BCA", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { unique_code: "ORD-ABC", nominal: 90000, qr_url: "https://qr.example?ref=ORD-ABC", status: "pending_payment" } })));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-ABC"]}><ThanksPage /></MemoryRouter>);
    expect(await screen.findByText(/ORD-ABC/)).toBeInTheDocument();
    expect(screen.getAllByText(/90.?000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("7615560677")).toBeInTheDocument();
    expect(screen.getByText("Fransiskus Xaverius Kevin")).toBeInTheDocument();
    expect(screen.getByText("BCA")).toBeInTheDocument();
  });

  it("tautan Lacak pesanan + Riwayat + Salin kode tampil, dan catatan kedaluwarsa", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { unique_code: "ORD-ABC", nominal: 90000, qr_url: "https://qr.example?ref=ORD-ABC", status: "pending_payment" } })));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-ABC"]}><ThanksPage /></MemoryRouter>);
    expect(await screen.findByRole("link", { name: "Lacak pesanan" })).toHaveAttribute("href", "/status/ORD-ABC");
    expect(screen.getByRole("link", { name: "Riwayat pesanan" })).toHaveAttribute("href", "/riwayat");
    expect(screen.getByRole("button", { name: "Salin kode pesanan" })).toBeInTheDocument();
    expect(screen.getByText(/kedaluwarsa otomatis sekitar 2 jam/i)).toBeInTheDocument();
  });

  it("gangguan jaringan TIDAK mengganti halaman jadi 'tidak ditemukan' (tampil 'mencoba lagi')", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network down"); }));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-ABC"]}><ThanksPage /></MemoryRouter>);
    expect(await screen.findByText(/Koneksi terputus/)).toBeInTheDocument();
    expect(screen.queryByText(/tidak ditemukan/i)).toBeNull();
  });

  it("sudah dibayar -> stepper tampil, tahap 'Siap' bisa aktif", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { unique_code: "ORD-ABC", nominal: 90000, qr_url: null, status: "ready" } })));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-ABC"]}><ThanksPage /></MemoryRouter>);
    const list = await screen.findByRole("list", { name: "Tahap pesanan" });
    expect(list.querySelector('[aria-current="step"]')).toHaveTextContent("Siap");
    expect(list.querySelectorAll("li.is-done")).toHaveLength(2);
  });
  it("tombol salin rekening dan salin kode pesanan terpisah (tak saling mengubah label)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { unique_code: "ORD-ABC", nominal: 90000, qr_url: null, status: "pending_payment" } })));
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn(async () => {}) }, configurable: true });
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-ABC"]}><ThanksPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Salin kode pesanan" }));
    expect(await screen.findByRole("button", { name: "Tersalin!" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salin" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /qris|qr/i })).toBeNull();
  });

  it("nomor antrian harian tampil dari id order", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: { order_id: "HP-261124-0007", unique_code: "ORD-ABC", nominal: 90000, qr_url: null, status: "pending_payment" } })));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-ABC"]}><ThanksPage /></MemoryRouter>);
    expect(await screen.findByText("#007")).toBeInTheDocument();
    expect(screen.getByText("No. antrian")).toBeInTheDocument();
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
