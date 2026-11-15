import { describe, it, expect } from "vitest";
import { tagLabel } from "./content.ts";

describe("tagLabel", () => {
  it("slug dikenal -> label sesuai bahasa", () => {
    expect(tagLabel("high-protein", "id")).toBe("Tinggi protein");
    expect(tagLabel("high-protein", "en")).toBe("High protein");
    expect(tagLabel("Gluten-Free", "id")).toBe("Bebas gluten");
  });
  it("slug tak dikenal -> spasi + huruf kapital awal, tanpa tanda hubung mentah", () => {
    expect(tagLabel("zero-waste", "id")).toBe("Zero waste");
  });
});
