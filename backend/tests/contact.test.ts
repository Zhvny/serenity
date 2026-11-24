import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeName, normalizePhone } from "../src/services/contact.js";

describe("contact normalisation", () => {
  it("nomor WA Indonesia berbagai format -> 62...", () => {
    assert.equal(normalizePhone("0812-3456-7890"), "6281234567890");
    assert.equal(normalizePhone("+62 812 3456 7890"), "6281234567890");
    assert.equal(normalizePhone("6281234567890"), "6281234567890");
    assert.equal(normalizePhone("81234567890"), "6281234567890");
    assert.equal(normalizePhone("(0812) 3456.7890"), "6281234567890");
  });
  it("nomor tidak masuk akal ditolak", () => {
    assert.equal(normalizePhone("12345"), null);
    assert.equal(normalizePhone("021-555-1234"), null); // telepon rumah, bukan WA seluler
    assert.equal(normalizePhone("08abc"), null);
    assert.equal(normalizePhone("0812345678901234567"), null);
  });
  it("nama dirapikan; terlalu pendek/panjang/angka/simbol ditolak", () => {
    assert.equal(normalizeName("  Budi   Santoso "), "Budi Santoso");
    assert.equal(normalizeName("A"), null);
    assert.equal(normalizeName("Budi123"), null);
    assert.equal(normalizeName("Budi@Santoso"), null);
    assert.equal(normalizeName("x".repeat(81)), null);
  });
});
