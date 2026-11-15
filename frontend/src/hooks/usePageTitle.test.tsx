import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { usePageTitle } from "./usePageTitle.ts";

function Probe({ title }: { title: string | null }) { usePageTitle(title); return null; }

afterEach(() => { cleanup(); document.title = ""; });

describe("usePageTitle", () => {
  it("judul halaman + merek", () => {
    render(<Probe title="Menu" />);
    expect(document.title).toBe("Menu · Serenity");
  });
  it("tanpa judul -> hanya merek", () => {
    render(<Probe title={null} />);
    expect(document.title).toBe("Serenity");
  });
});
