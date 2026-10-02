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
    expect(await screen.findByText(/dibayar|lunas/i)).toBeInTheDocument();
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
