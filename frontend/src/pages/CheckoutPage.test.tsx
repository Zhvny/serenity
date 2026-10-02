import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { CheckoutPage } from "./CheckoutPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function resp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("CheckoutPage", () => {
  it("tombol Bayar disabled sampai consent dicentang", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "success", data: [] })));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    const btn = await screen.findByRole("button", { name: /bayar/i });
    expect(btn).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    expect(btn).not.toBeDisabled();
  });

  it("klik Bayar -> panggil generate-code dgn donation_consent", async () => {
    const user = userEvent.setup();
    const bodies: Array<string | undefined> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      bodies.push(init?.body as string | undefined);
      return resp({ status: "success", data: { order_id: "HP-1", unique_code: "ORD-1", qr_url: "https://qr?ref=ORD-1", nominal: 90000 } });
    }));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await user.click(screen.getByRole("checkbox"));
    await user.click(await screen.findByRole("button", { name: /bayar/i }));
    expect(bodies.some((b) => b !== undefined && b.includes('"donation_consent":true'))).toBe(true);
  });
});
