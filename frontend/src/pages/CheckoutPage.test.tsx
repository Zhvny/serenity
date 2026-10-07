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

describe("CheckoutPage", () => {
  it("angka detik berdetak tiap detik sampai checkbox aktif", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: [] })));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    expect(screen.getByText(/\(mohon baca dulu… 5\)/)).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(screen.getByText(/\(mohon baca dulu… 4\)/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
    expect(screen.getByRole("checkbox")).toBeEnabled();
  });
  it("bayar + checkbox terkunci sampai jeda baca selesai", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: [] })));
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
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
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
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
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

  it("tanpa widget (token kosong) -> tombol tetap disabled walau sudah centang", async () => {
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await act(async () => { vi.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: /bayar/i })).toBeDisabled();
  });

  it("script tak termuat 10 dtk -> pesan pemblokir", async () => {
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.getByRole("alert")).toHaveTextContent(/pemblokir/i);
  });

  it("403 TURNSTILE_FAILED -> pesan arahan Riwayat", async () => {
    stubTurnstile();
    vi.stubGlobal("fetch", vi.fn(async () =>
      resp({ status: "error", code: "TURNSTILE_FAILED", message: "Verifikasi gagal" }, 403)));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await act(async () => { vi.advanceTimersByTime(5000); });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /bayar/i }));
    await vi.waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Riwayat/));
  });
});
