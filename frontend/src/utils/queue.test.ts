import { describe, it, expect } from "vitest";
import { queueNo } from "./queue.ts";

describe("queueNo", () => {
  it("id order harian -> nomor antrian pendek", () => {
    expect(queueNo("HP-261124-0001")).toBe("#001");
    expect(queueNo("HP-261124-0042")).toBe("#042");
    expect(queueNo("HP-261124-1234")).toBe("#1234");
  });
  it("id tak dikenal / kosong -> null", () => {
    expect(queueNo("ORD-ABC")).toBeNull();
    expect(queueNo(undefined)).toBeNull();
  });
});
