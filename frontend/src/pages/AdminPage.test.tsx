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
    let n = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      // 1: list awal 200 (data kosong) -> tampil form tambah; csrf GET 200; create -> 401 UNAUTH
      if (String(url).includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      n += 1;
      if (n === 1) return resp({ status: "success", data: [] });
      return resp({ status: "error", code: "UNAUTH", message: "Sesi habis" }, 401);
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
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
      if (u.includes("/admin/products/prod_001") && method === "PUT") return resp({ status: "success", data: { id: "prod_001" } });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [prod] });
      return resp({ status: "success", data: [prod] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await screen.findByRole("button", { name: /edit choco lava/i });
    await user.click(screen.getByRole("button", { name: /edit choco lava/i }));
    expect(screen.getByLabelText(/id produk/i)).toBeDisabled();
    expect((screen.getByLabelText(/nama/i) as HTMLInputElement).value).toBe("Choco Lava");
    await user.click(screen.getByRole("button", { name: /simpan perubahan/i }));
    const put = calls.find((c) => c.method === "PUT" && c.url.includes("/admin/products/prod_001"));
    expect(put).toBeDefined();
    expect(put?.body).toContain("Choco Lava");
  });
});
