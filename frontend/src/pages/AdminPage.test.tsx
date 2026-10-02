import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { AdminPage } from "./AdminPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function resp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("AdminPage", () => {
  it("belum login (401 UNAUTH) -> tampil form Login", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ status: "error", code: "UNAUTH", message: "Login dulu" }, 401)));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(await screen.findByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("sesi habis saat submit -> kembali ke form Login", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url); const method = init?.method ?? "GET";
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      // GET awal (products + orders) sukses -> tampil form; mutation (POST create) -> 401.
      if (method === "GET") return resp({ status: "success", data: [] });
      return resp({ status: "error", code: "UNAUTH", message: "Sesi habis" }, 401);
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await screen.findByRole("button", { name: "Produk" });
    await user.click(screen.getByRole("button", { name: "Produk" }));
    await screen.findByRole("button", { name: /tambah produk/i });
    await user.type(screen.getByLabelText(/id produk/i), "p9");
    await user.type(screen.getByLabelText(/nama/i), "X");
    await user.type(screen.getByLabelText(/harga/i), "10000");
    await user.click(screen.getByRole("button", { name: /tambah produk/i }));
    expect(await screen.findByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("klik Edit -> form terisi + submit kirim PUT update", async () => {
    const user = userEvent.setup();
    const prod = { id: "prod_001", name: "Choco Lava", category_id: "cat_dessert", price: 30000, tags: ["low-sugar"], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, fiber_g: 1, sugar_g: 1 }, allergens: [] as string[] };
    const calls: Array<{ url: string; method: string; body: string | undefined }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url); const method = init?.method ?? "GET";
      calls.push({ url: u, method, body: init?.body as string | undefined });
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [] });
      if (u.includes("/admin/products/prod_001") && method === "PUT") return resp({ status: "success", data: { id: "prod_001" } });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [prod] });
      return resp({ status: "success", data: [prod] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await screen.findByRole("button", { name: "Produk" });
    await user.click(screen.getByRole("button", { name: "Produk" }));
    await screen.findByRole("button", { name: /edit choco lava/i });
    await user.click(screen.getByRole("button", { name: /edit choco lava/i }));
    expect(screen.getByLabelText(/id produk/i)).toBeDisabled();
    expect((screen.getByLabelText(/nama/i) as HTMLInputElement).value).toBe("Choco Lava");
    await user.click(screen.getByRole("button", { name: /simpan perubahan/i }));
    const put = calls.find((c) => c.method === "PUT" && c.url.includes("/admin/products/prod_001"));
    expect(put).toBeDefined();
    expect(put?.body).toContain("Choco Lava");
  });

  it("panel pending + Tandai Lunas -> POST mark-paid", async () => {
    const user = userEvent.setup();
    const order = { id: "HP-1", unique_code: "ORD-ABC", total_amount: 90000, status: "pending_payment", delivery_method: "delivery", created_at: "2026-10-02T00:00:00Z" };
    const calls: Array<{ url: string; method: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url); const method = init?.method ?? "GET";
      calls.push({ url: u, method });
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/orders/ORD-ABC/mark-paid")) return resp({ status: "success", data: { paid: true, changed: true } });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [order] });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [] });
      return resp({ status: "success", data: [] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await screen.findByText("ORD-ABC");
    await user.click(screen.getByRole("button", { name: /tandai lunas ORD-ABC/i }));
    expect(calls.some((c) => c.method === "POST" && c.url.includes("/admin/orders/ORD-ABC/mark-paid"))).toBe(true);
  });

  it("klik order -> detail (item+alamat) + Majukan -> POST advance", async () => {
    const user = userEvent.setup();
    const paidOrder = { id: "HP-9", unique_code: "ORD-PAID9", total_amount: 45000, status: "paid", delivery_method: "delivery", created_at: "2026-10-02T00:00:00Z" };
    const det = { ...paidOrder, mode: "instant", scheduled_at: null, delivery_address: "Jl. Mawar No.5", delivery_lat: null, delivery_lng: null, items: [{ product_id: "prod_001", name: "Choco Lava", quantity: 2, note: null, price_at_order: 22500 }] };
    const calls: Array<{ url: string; method: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url); const method = init?.method ?? "GET";
      calls.push({ url: u, method });
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/orders/ORD-PAID9/advance")) return resp({ status: "success", data: { status: "preparing" } });
      if (u.includes("/admin/orders/ORD-PAID9")) return resp({ status: "success", data: det });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [paidOrder] });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [] });
      return resp({ status: "success", data: [] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: /detail ORD-PAID9/i }));
    expect(await screen.findByText("Jl. Mawar No.5")).toBeInTheDocument();
    expect(screen.getByText(/Choco Lava/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mulai Siapkan" }));
    expect(calls.some((c) => c.method === "POST" && c.url.includes("/admin/orders/ORD-PAID9/advance"))).toBe(true);
  });
});
