import { describe, it, expect, vi, afterEach } from "vitest";
import { apiGet, getProducts, getCart, updateCartItem, removeCartItem, ApiError } from "./api.ts";

afterEach(() => vi.unstubAllGlobals());

describe("apiGet", () => {
  it("non-2xx → throw ApiError {code,message}", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "error", code: "X", message: "Rusak" }), { status: 500 })));
    await expect(apiGet("/products")).rejects.toMatchObject({ code: "X", message: "Rusak" });
  });
  it("network gagal → throw ApiError NETWORK", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("down"); }));
    await expect(getProducts({})).rejects.toBeInstanceOf(ApiError);
  });
  it("kirim credentials include agar cookie sesi tersimpan", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ status: "success", data: [] })));
    vi.stubGlobal("fetch", f);
    await getProducts({});
    expect((f.mock.calls as unknown[][])[0]?.[1]).toMatchObject({ credentials: "include" });
  });
  it("query category+tag ter-encode", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ status: "success", data: [] })));
    vi.stubGlobal("fetch", f);
    await getProducts({ category: "cat_food", tag: "high-protein" });
    expect((f.mock.calls as unknown[][])[0]?.[0]).toContain("category=cat_food&tag=high-protein");
  });
});

describe("apiPut/apiDelete cart", () => {
  it("PUT kirim method+body benar", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ status: "success", data: { item_id: "i1", product_id: "p1", quantity: 2, note: null } })));
    vi.stubGlobal("fetch", f);
    await updateCartItem("i1", 2);
    const [url, init] = (f.mock.calls as unknown[][])[0] as [string, RequestInit];
    expect(url).toContain("/cart/items/i1");
    expect(init).toMatchObject({ method: "PUT", credentials: "include" });
    expect(JSON.parse(String(init.body))).toEqual({ quantity: 2 });
  });
  it("DELETE method benar", async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ status: "success", data: { removed: true } })));
    vi.stubGlobal("fetch", f);
    await removeCartItem("i1");
    const [url, init] = (f.mock.calls as unknown[][])[0] as [string, RequestInit];
    expect(url).toContain("/cart/items/i1");
    expect(init).toMatchObject({ method: "DELETE", credentials: "include" });
  });
  it("getCart network gagal → ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("down"); }));
    await expect(getCart()).rejects.toBeInstanceOf(ApiError);
  });
});
