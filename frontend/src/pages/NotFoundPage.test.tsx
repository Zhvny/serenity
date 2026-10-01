import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../App.tsx";

describe("not found", () => {
  it("route tak dikenal -> halaman 404", async () => {
    render(<MemoryRouter initialEntries={["/jalan-ngawur"]}><App /></MemoryRouter>);
    expect(await screen.findByRole("heading", { name: /tidak ditemukan/i })).toBeInTheDocument();
  });
});
