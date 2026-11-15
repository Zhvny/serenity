import { describe, it, expect, afterEach } from "vitest";
import { fmtNutrient } from "./format.ts";
import { apiMessage } from "./apiMessage.ts";
import { ApiError } from "../services/api.ts";
import { setLang } from "../i18n/store.ts";

afterEach(() => { setLang("id"); });

describe("fmtNutrient", () => {
  it("string NUMERIC Postgres dirapikan; kosong -> tanda strip", () => {
    expect(fmtNutrient("28.00")).toBe("28");
    expect(fmtNutrient("6.50")).toBe("6.5");
    expect(fmtNutrient(320)).toBe("320");
    expect(fmtNutrient(null)).toBe("–");
    expect(fmtNutrient(undefined)).toBe("–");
    expect(fmtNutrient("abc")).toBe("–");
  });
});

describe("apiMessage", () => {
  it("RATE_LIMITED mengikuti bahasa pengguna, bukan teks mentah server", () => {
    const e = new ApiError("RATE_LIMITED", "Terlalu banyak permintaan");
    expect(apiMessage(e)).toMatch(/Terlalu banyak permintaan\. Tunggu sebentar/);
    setLang("en");
    expect(apiMessage(e)).toBe("Too many requests. Please wait a moment and try again.");
  });
  it("NETWORK dan NOT_FOUND diterjemahkan; kode lain memakai pesan server; non-ApiError -> pesan umum", () => {
    setLang("en");
    expect(apiMessage(new ApiError("NETWORK", "Tidak dapat menghubungi server"))).toMatch(/Can't reach the server/);
    expect(apiMessage(new ApiError("PRODUCT_NOT_FOUND", "Produk tidak ditemukan"))).toBe("Not found.");
    expect(apiMessage(new ApiError("SOMETHING_ELSE", "Pesan khusus"))).toBe("Pesan khusus");
    expect(apiMessage(new Error("x"))).toBe("Something went wrong");
  });
});
