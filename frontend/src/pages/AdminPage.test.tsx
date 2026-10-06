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
  it("boot -> skeleton, bukan form login", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    const { container } = render(<MemoryRouter><AdminPage /></MemoryRouter>);
    expect(container.querySelector(".skeleton")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /login/i })).toBeNull();
  });

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
    await user.type(screen.getByLabelText("Nama"), "X");
    await user.type(screen.getByLabelText(/harga/i), "10000");
    await user.click(screen.getByRole("button", { name: /tambah produk/i }));
    expect(await screen.findByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("form produk: isi Nama EN -> PUT memuat name_en; kosong -> tak dikirim", async () => {    const user = userEvent.setup();
    const prod = { id: "prod_001", name: "Choco Lava", category_id: "cat_dessert", price: 30000, tags: ["low-sugar"], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, fiber_g: 1, sugar_g: 1 }, allergens: [] as string[] };
    const calls: Array<{ url: string; method: string; body: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url); const method = init?.method ?? "GET";
      calls.push({ url: u, method, body: String(init?.body ?? "") });
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [] });
      if (u.includes("/admin/products/prod_001") && method === "PUT") return resp({ status: "success", data: { id: "prod_001" } });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [prod] });
      return resp({ status: "success", data: [prod] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Produk" }));
    await user.click(await screen.findByRole("button", { name: /edit choco lava/i }));
    await user.type(screen.getByLabelText(/nama inggris/i), "Choco Lava EN");
    await user.click(screen.getByRole("button", { name: /simpan perubahan/i }));
    const put = calls.find((c) => c.method === "PUT" && c.url.includes("/admin/products/prod_001"));
    expect(put?.body).toContain('"name_en":"Choco Lava EN"');
  });
  it("form produk: isi Deskripsi EN -> PUT memuat description_en", async () => {
    const user = userEvent.setup();
    const prod = { id: "prod_001", name: "Choco Lava", category_id: "cat_dessert", price: 30000, tags: [], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, fiber_g: 1, sugar_g: 1 }, allergens: [] as string[] };
    const calls: Array<{ url: string; method: string; body: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url); const method = init?.method ?? "GET";
      calls.push({ url: u, method, body: String(init?.body ?? "") });
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [] });
      if (u.includes("/admin/products/prod_001") && method === "PUT") return resp({ status: "success", data: { id: "prod_001" } });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [prod] });
      return resp({ status: "success", data: [prod] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Produk" }));
    await user.click(await screen.findByRole("button", { name: /edit choco lava/i }));
    await user.type(screen.getByLabelText(/deskripsi inggris/i), "Tasty EN");
    await user.click(screen.getByRole("button", { name: /simpan perubahan/i }));
    const put = calls.find((c) => c.method === "PUT" && c.url.includes("/admin/products/prod_001"));
    expect(put?.body).toContain('"description_en":"Tasty EN"');
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
    expect((screen.getByLabelText("Nama") as HTMLInputElement).value).toBe("Choco Lava");
    await user.click(screen.getByRole("button", { name: /simpan perubahan/i }));
    const put = calls.find((c) => c.method === "PUT" && c.url.includes("/admin/products/prod_001"));
    expect(put).toBeDefined();
    expect(put?.body).toContain("Choco Lava");
  });

  it("tag produk tampil sebagai chip; klik chip mengisi input", async () => {
    const user = userEvent.setup();
    const prod = { id: "prod_001", name: "Choco Lava", category_id: "cat_dessert", price: 30000, tags: ["low-sugar", "vegan"], image_url: null, description: null, is_active: true, nutrition: { calories_kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, fiber_g: 1, sugar_g: 1 }, allergens: [] as string[] };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [] });
      return resp({ status: "success", data: [prod] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await screen.findByRole("button", { name: "Produk" });
    await user.click(screen.getByRole("button", { name: "Produk" }));
    expect(await screen.findByRole("group", { name: "Tag yang sudah ada" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "vegan" }));
    expect((screen.getByLabelText(/tags/i) as HTMLInputElement).value).toBe("vegan");
    await user.click(screen.getByRole("button", { name: "low-sugar" }));
    expect((screen.getByLabelText(/tags/i) as HTMLInputElement).value).toBe("vegan, low-sugar");
  });

  it("panel pending + Tandai Lunas -> POST mark-paid dgn paid_amount=total", async () => {
    const user = userEvent.setup();
    const order = { id: "HP-1", unique_code: "ORD-ABC", total_amount: 90000, status: "pending_payment", delivery_method: "delivery", created_at: "2026-10-02T00:00:00Z" };
    const calls: Array<{ url: string; method: string; body: string | undefined }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url); const method = init?.method ?? "GET";
      calls.push({ url: u, method, body: init?.body as string | undefined });
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/orders/ORD-ABC/mark-paid")) return resp({ status: "success", data: { paid: true, changed: true, status: "paid" } });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [order] });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [] });
      return resp({ status: "success", data: [] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await screen.findByText("ORD-ABC");
    await user.click(screen.getByRole("button", { name: /tandai lunas ORD-ABC/i }));
    const mp = calls.find((c) => c.method === "POST" && c.url.includes("/admin/orders/ORD-ABC/mark-paid"));
    expect(mp).toBeDefined();
    expect(mp?.body).toContain('"paid_amount":90000');
  });

  it("filter Kurang bayar -> fetch status=underpaid", async () => {
    const user = userEvent.setup();
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      urls.push(String(url));
      return resp({ status: "success", data: [] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await screen.findByRole("button", { name: "Kurang bayar" });
    await user.click(screen.getByRole("button", { name: "Kurang bayar" }));
    await vi.waitFor(() => expect(urls.some((u) => u.includes("status=underpaid"))).toBe(true));
  });

  it("filter Dibatalkan -> fetch status=cancelled", async () => {
    const user = userEvent.setup();
    const urls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      urls.push(String(url));
      return resp({ status: "success", data: [] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await screen.findByRole("button", { name: "Dibatalkan" });
    await user.click(screen.getByRole("button", { name: "Dibatalkan" }));
    await vi.waitFor(() => expect(urls.some((u) => u.includes("status=cancelled"))).toBe(true));
  });

  it("detail underpaid -> Dibayar X dari Y + Lunaskan -> POST settle-parent", async () => {
    const user = userEvent.setup();
    const order = { id: "HP-2", unique_code: "ORD-U2", total_amount: 50000, paid_amount: 30000, parent_code: null, status: "underpaid", delivery_method: "pickup", created_at: "2026-10-02T00:00:00Z" };
    const det = { ...order, mode: "instant", scheduled_at: null, delivery_address: null, delivery_lat: null, delivery_lng: null, items: [] };
    const calls: Array<{ url: string; method: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url); const method = init?.method ?? "GET";
      calls.push({ url: u, method });
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/orders/ORD-U2/settle-parent")) return resp({ status: "success", data: { status: "paid" } });
      if (u.includes("/admin/orders/ORD-U2") && method === "GET") return resp({ status: "success", data: det });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [order] });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [] });
      return resp({ status: "success", data: [] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: /detail ORD-U2/i }));
    expect(await screen.findByText(/dari/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /lunaskan/i }));
    expect(calls.some((c) => c.method === "POST" && c.url.includes("/admin/orders/ORD-U2/settle-parent"))).toBe(true);
  });

  it("detail underpaid belum bisa settle -> Lunaskan disabled + syarat", async () => {
    const user = userEvent.setup();
    const order = { id: "HP-4", unique_code: "ORD-U4", total_amount: 50000, paid_amount: 30000, parent_code: null, status: "underpaid", delivery_method: "pickup", created_at: "2026-10-02T00:00:00Z" };
    const det = { ...order, mode: "instant", scheduled_at: null, delivery_address: null, delivery_lat: null, delivery_lng: null, items: [], settle_info: { sisa: 20000, anak_lunas: 0, bisa: false } };
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url); const method = init?.method ?? "GET";
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/orders/ORD-U4") && method === "GET") return resp({ status: "success", data: det });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [order] });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [] });
      return resp({ status: "success", data: [] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: /detail ORD-U4/i }));
    expect(await screen.findByText(/butuh anak top-up/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /lunaskan ORD-U4/i })).toBeDisabled();
  });

  it("detail pending -> nominal kurang -> Catat Kurang Bayar + pindah filter", async () => {
    const user = userEvent.setup();
    const order = { id: "HP-3", unique_code: "ORD-U3", total_amount: 50000, status: "pending_payment", delivery_method: "pickup", created_at: "2026-10-02T00:00:00Z" };
    const det = { ...order, paid_amount: null, parent_code: null, mode: "instant", scheduled_at: null, delivery_address: null, delivery_lat: null, delivery_lng: null, items: [] };
    const detUnder = { ...det, paid_amount: 30000, status: "underpaid" };
    const calls: Array<{ url: string; method: string; body: string | undefined }> = [];
    let marked = false;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url); const method = init?.method ?? "GET";
      calls.push({ url: u, method, body: init?.body as string | undefined });
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/orders/ORD-U3/mark-paid")) {
        marked = true;
        return resp({ status: "success", data: { paid: false, changed: true, status: "underpaid" } });
      }
      if (u.includes("/admin/orders/ORD-U3") && method === "GET") return resp({ status: "success", data: marked ? detUnder : det });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [order] });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [] });
      return resp({ status: "success", data: [] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: /detail ORD-U3/i }));
    const input = await screen.findByLabelText(/nominal masuk/i) as HTMLInputElement;
    expect(input.value).toBe("50000");
    expect(screen.getByRole("button", { name: /^tandai lunas$/i })).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, "30000");
    await user.click(screen.getByRole("button", { name: /catat kurang bayar/i }));
    const mp = calls.find((c) => c.method === "POST" && c.url.includes("/admin/orders/ORD-U3/mark-paid"));
    expect(mp?.body).toContain('"paid_amount":30000');
    await vi.waitFor(() => expect(calls.some((c) => c.url.includes("status=underpaid"))).toBe(true));
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

  it("tab Post -> isi form -> submit kirim POST /admin/posts", async () => {
    const user = userEvent.setup();
    const calls: Array<{ url: string; method: string; body: string | undefined }> = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url); const method = init?.method ?? "GET";
      calls.push({ url: u, method, body: init?.body as string | undefined });
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/posts")) return resp({ status: "success", data: { id: "post-1" } });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [] });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [] });
      return resp({ status: "success", data: [] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Post" }));
    const btn = screen.getByRole("button", { name: /simpan post/i });
    expect(btn).toBeDisabled();
    await user.type(screen.getByLabelText("Judul"), "Judul Baru");
    await user.type(screen.getByLabelText("Isi"), "Isi baru.");
    expect(btn).toBeEnabled();
    await user.click(btn);
    const post = calls.find((c) => c.method === "POST" && c.url.includes("/admin/posts"));
    expect(post?.body).toContain('"title":"Judul Baru"');
    expect(await screen.findByText("Post tersimpan.")).toBeInTheDocument();
  });

  it("tab Post -> ketik judul -> pratinjau ikut berubah", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [] });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [] });
      return resp({ status: "success", data: [] });
    }));
    render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Post" }));
    await user.type(screen.getByLabelText("Judul"), "Promo Spesial");
    const preview = screen.getByLabelText("Pratinjau post");
    expect(preview).toHaveTextContent("Promo Spesial");
  });

  it("mobile (matchMedia false) -> kartu pesanan, bukan tabel", async () => {
    const order = { id: "HP-1", unique_code: "ORD-ABC", total_amount: 90000, status: "pending_payment", delivery_method: "delivery", created_at: "2026-10-02T00:00:00Z" };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/csrf")) return resp({ status: "success", data: { csrfToken: "t1" } });
      if (u.includes("/admin/orders")) return resp({ status: "success", data: [order] });
      if (u.includes("/admin/products")) return resp({ status: "success", data: [] });
      return resp({ status: "success", data: [] });
    }));
    const { container } = render(<MemoryRouter><AdminPage /></MemoryRouter>);
    await screen.findByText("ORD-ABC");
    expect(container.querySelector(".order-cards")).not.toBeNull();
    expect(container.querySelector(".admin-table")).toBeNull();
    expect(screen.getByText("Rp 90.000")).toBeInTheDocument();
  });
});
