import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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

  it("underpaid -> Kurang + Buat kode top-up -> ref anak", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/topup")) return resp({ status: "success", data: { order_id: "HP-C", unique_code: "ORD-CHILD", qr_url: "q", nominal: 20000 } });
      if (u.includes("ref=ORD-CHILD")) return resp({ status: "success", data: { unique_code: "ORD-CHILD", nominal: 20000, paid_amount: null, qr_url: "q", status: "pending_payment" } });
      return resp({ status: "success", data: { unique_code: "ORD-U", nominal: 90000, paid_amount: 70000, qr_url: "q", status: "underpaid" } });
    }));
    render(<MemoryRouter initialEntries={["/thanks?ref=ORD-U"]}><ThanksPage /></MemoryRouter>);
    expect(await screen.findByText(/Kurang/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /top-up/i }));
    expect(await screen.findByText(/ORD-CHILD/)).toBeInTheDocument();
  });
});
