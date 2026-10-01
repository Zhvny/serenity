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
});
