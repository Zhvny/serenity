import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { LocationPicker } from "./LocationPicker.tsx";
import { setLang } from "../i18n/store.ts";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); setLang("id"); });

function mockGeolocation(): ReturnType<typeof vi.fn> {
  const getCurrentPosition = vi.fn();
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
  return getCurrentPosition;
}

describe("LocationPicker consent", () => {
  it("klik lokasi saya -> dialog persetujuan, geolocation belum dipanggil", () => {
    const spy = mockGeolocation();
    render(<LocationPicker value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /gunakan lokasi saya/i }));
    expect(screen.getByRole("dialog", { name: /izin lokasi/i })).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("setuju -> geolocation dipanggil; batal -> tidak", () => {
    const spy = mockGeolocation();
    render(<LocationPicker value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /gunakan lokasi saya/i }));
    fireEvent.click(screen.getByRole("button", { name: /^setuju/i }));
    expect(spy).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog", { name: /izin lokasi/i })).toBeNull();
  });

  it("batal -> dialog tutup tanpa geolocation", () => {
    const spy = mockGeolocation();
    render(<LocationPicker value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /gunakan lokasi saya/i }));
    fireEvent.click(screen.getByRole("button", { name: /batal/i }));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: /izin lokasi/i })).toBeNull();
  });
});
