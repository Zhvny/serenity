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
});
