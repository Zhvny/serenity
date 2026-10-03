import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../App.tsx";
import { setLang } from "../i18n/store.ts";

afterEach(() => { cleanup(); setLang("id"); window.localStorage.clear(); });

describe("not found", () => {
  it("route tak dikenal -> halaman 404", async () => {
    render(<MemoryRouter initialEntries={["/jalan-ngawur"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: /tidak ditemukan/i })).toBeInTheDocument();
  });

  it("bahasa Inggris -> teks 404 dalam bahasa Inggris", async () => {
    setLang("en");
    render(<MemoryRouter initialEntries={["/jalan-ngawur"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByText(/toast got burnt/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
    expect(screen.queryByText(/tidak ditemukan/i)).toBeNull();
  });
});
