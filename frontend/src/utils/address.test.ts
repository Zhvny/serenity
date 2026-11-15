import { describe, it, expect } from "vitest";
import { shouldFillAddress } from "./address.ts";

describe("shouldFillAddress", () => {
  it("kolom kosong -> boleh diisi dari peta", () => {
    expect(shouldFillAddress("", true)).toBe(true);
    expect(shouldFillAddress("   ", true)).toBe(true);
  });
  it("belum diketik pengguna (hasil peta sebelumnya) -> boleh diperbarui", () => {
    expect(shouldFillAddress("Jalan hasil peta lama", false)).toBe(true);
  });
  it("sudah diketik pengguna -> TIDAK ditimpa", () => {
    expect(shouldFillAddress("Jl. Kebon Jeruk No. 27, dekat warung", true)).toBe(false);
  });
});
