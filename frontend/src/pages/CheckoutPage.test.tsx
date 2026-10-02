import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CheckoutPage } from "./CheckoutPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
beforeEach(() => { vi.useFakeTimers(); });

function resp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("CheckoutPage", () => {
  it("bayar + checkbox terkunci sampai jeda baca selesai", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: [] })));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: /bayar/i })).toBeDisabled();
    expect(screen.getByRole("checkbox")).toBeDisabled();
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(screen.getByRole("checkbox")).toBeEnabled();
    expect(screen.getByRole("button", { name: /bayar/i })).toBeDisabled();
  });

  it("tanpa centang -> tetap disabled; centang -> kirim donation_consent true", async () => {
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
});
