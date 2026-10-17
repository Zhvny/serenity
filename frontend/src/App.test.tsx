import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { ScrollToTop } from "./App.tsx";

describe("ScrollToTop", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function TestNavigator() {
    const navigate = useNavigate();
    return (
      <>
        <ScrollToTop />
        <button type="button" onClick={() => void navigate("/menu")}>Go to Menu</button>
      </>
    );
  }

  it("mereset scroll ke (0, 0) saat mount dan saat rute berubah", () => {
    const { getByRole } = render(
      <MemoryRouter initialEntries={["/"]}>
        <TestNavigator />
      </MemoryRouter>
    );

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    vi.mocked(window.scrollTo).mockClear();

    act(() => {
      getByRole("button", { name: "Go to Menu" }).click();
    });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
