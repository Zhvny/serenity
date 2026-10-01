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
  it("klik Bayar -> panggil generate-code", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      calls.push(String(url));
      return resp({ status: "success", data: { order_id: "HP-1", unique_code: "ORD-1", qr_url: "https://qr?ref=ORD-1", nominal: 90000 } });
    }));
    render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: /bayar/i }));
    expect(calls.some((u) => u.includes("/orders/generate-code"))).toBe(true);
  });
});
