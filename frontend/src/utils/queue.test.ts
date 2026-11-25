import { describe, it, expect } from "vitest";
import { queueNo } from "./queue.ts";

describe("queueNo", () => {
it("nomor pembayaran -> nomor antrian pendek", () => {
expect(queueNo(1)).toBe("#001");
expect(queueNo(42)).toBe("#042");
expect(queueNo(1234)).toBe("#1234");
});
it("nomor kosong / invalid -> null", () => {
expect(queueNo(null)).toBeNull();
expect(queueNo(undefined)).toBeNull();
expect(queueNo(0)).toBeNull();
});
});
