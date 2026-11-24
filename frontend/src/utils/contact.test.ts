import { describe, it, expect } from "vitest";
import { normalizeName, normalizePhone } from "./contact.ts";

describe("kontak pemesan", () => {
  it("nomor WA berbagai format -> 62...", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("6281234567890");
    expect(normalizePhone("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizePhone("81234567890")).toBe("6281234567890");
  });
  it("nomor tak masuk akal ditolak", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("021-555-1234")).toBeNull();
    expect(normalizePhone("08abc")).toBeNull();
  });
  it("nama dirapikan; satu huruf/angka/simbol ditolak", () => {
    expect(normalizeName("  Budi   Santoso ")).toBe("Budi Santoso");
    expect(normalizeName("A")).toBeNull();
    expect(normalizeName("Budi123")).toBeNull();
    expect(normalizeName("Budi_Santoso")).toBeNull();
  });
});
