import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { HistoryPage } from "./HistoryPage.tsx";
import { setLang } from "../i18n/store.ts";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); setLang("id"); window.localStorage.clear(); });

const paid = { id: "HP-1", unique_code: "ORD-1", total_amount: 50000, paid_amount: 50000, status: "paid", parent_code: null, donation_consent: true, created_at: "2026-10-02T10:00:00Z", items: [{ product_id: "p1", name: "Salad", quantity: 2 }] };
const under = { id: "HP-2", unique_code: "ORD-2", total_amount: 50000, paid_amount: 30000, status: "underpaid", parent_code: null, donation_consent: false, created_at: "2026-10-02T11:00:00Z", items: [] };

function mockList(data: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "success", data }))));
}

function renderRiwayat() {
  render(
    <MemoryRouter initialEntries={["/riwayat"]}>
      <Routes>
        <Route path="/riwayat" element={<HistoryPage />} />
        <Route path="/thanks" element={<div>THANKS</div>} />
        <Route path="/" element={<div>HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("HistoryPage", () => {
  it("loading → skeleton", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    const { container } = render(<MemoryRouter><HistoryPage /></MemoryRouter>);
    expect(container.querySelector(".skeleton")).not.toBeNull();
  });
  it("error → pesan + Coba lagi", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "error", code: "X", message: "Rusak" }), { status: 500 })));
    render(<MemoryRouter><HistoryPage /></MemoryRouter>);
    expect(await screen.findByRole("button", { name: "Coba lagi" })).toBeInTheDocument();
  });
  it("kosong → Belum ada pesanan + link menu", async () => {
    mockList([]);
    renderRiwayat();
    expect(await screen.findByRole("status")).toHaveTextContent("Belum ada pesanan");
    expect(screen.getByRole("link", { name: "Lihat menu" })).toHaveAttribute("href", "/");
  });
  it("isi → kartu nominal + item + badge donasi", async () => {
    mockList([paid]);
    renderRiwayat();
    expect(await screen.findByText("ORD-1")).toBeInTheDocument();
    expect(screen.getByText(/2× Salad/)).toBeInTheDocument();
    expect(screen.getByText("Donasi disetujui")).toBeInTheDocument();
  });
  it("underpaid → Kurang Rp + Bayar sisa → topup → /thanks?ref=", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/topup")) {
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify({ status: "success", data: { order_id: "HP-3", unique_code: "ORD-3", qr_url: "q", nominal: 20000 } }));
      }
      return new Response(JSON.stringify({ status: "success", data: [under] }));
    }));
    renderRiwayat();
    await screen.findByText("ORD-2");
    expect(screen.getByText(/Kurang Rp/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Bayar sisa" }));
    expect(await screen.findByText("THANKS")).toBeInTheDocument();
  });
  it("bahasa Inggris -> judul, chip, label baris, tanggal en-US", async () => {
    setLang("en");
    mockList([paid, under]);
    renderRiwayat();
    expect(screen.getByRole("heading", { level: 1, name: "Order History" })).toBeInTheDocument();
    const filters = screen.getByRole("group", { name: "Filter by status" });
    expect(within(filters).getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(within(filters).getByRole("button", { name: "Waiting for payment" })).toBeInTheDocument();
    expect(await screen.findByText("ORD-1")).toBeInTheDocument();
    expect(screen.getByText("Donation approved")).toBeInTheDocument();
    expect(screen.getAllByText(/Paid Rp/)).toHaveLength(2);
    expect(screen.getByText(/Rp.*short/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay the rest" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Track" })).toHaveLength(2);
    expect(screen.getAllByText(/Oct \d+, 2026/).length).toBe(2);
    expect(screen.queryByText("Lacak")).toBeNull();
  });
  it("bahasa Inggris -> keadaan kosong", async () => {
    setLang("en");
    mockList([]);
    renderRiwayat();
    expect(await screen.findByRole("status")).toHaveTextContent("No orders yet");
    expect(screen.getByRole("link", { name: "View menu" })).toHaveAttribute("href", "/");
  });
});
