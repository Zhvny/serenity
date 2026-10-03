import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { FunFactPage } from "./FunFactPage.tsx";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("FunFactPage", () => {
  it("render di /funfact: judul + card + tag", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "success", data: [] }))));
    render(
      <MemoryRouter initialEntries={["/funfact"]}>
        <Routes><Route path="/funfact" element={<FunFactPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: /fun fact/i })).toBeInTheDocument();
    expect(screen.getByText("Kenapa beli Serenity?")).toBeInTheDocument();
    expect(screen.getByText("Dessert sehat bukan mitos")).toBeInTheDocument();
    expect(screen.getByText("Pre-order = lebih segar")).toBeInTheDocument();
  });
});
