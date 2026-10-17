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

describe("LocationPicker geolocation error", () => {
  function locate(spy: ReturnType<typeof vi.fn>, code: number): void {
    spy.mockImplementation((_ok: unknown, err: (e: { code: number }) => void) => err({ code }));
    render(<LocationPicker value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /gunakan lokasi saya/i }));
    fireEvent.click(screen.getByRole("button", { name: /^setuju/i }));
  }

  it("tidak memaksa akurasi tinggi (desktop tanpa GPS)", () => {
    const spy = mockGeolocation();
    render(<LocationPicker value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /gunakan lokasi saya/i }));
    fireEvent.click(screen.getByRole("button", { name: /^setuju/i }));
    expect(spy.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: false });
  });

  it("PERMISSION_DENIED -> arahkan aktifkan izin situs", () => {
    const spy = mockGeolocation();
    locate(spy, 1);
    expect(screen.getByRole("alert")).toHaveTextContent(/izin lokasi ditolak/i);
  });

  it("POSITION_UNAVAILABLE + IP fallback gagal -> arahkan aktifkan Location Services", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const spy = mockGeolocation();
    locate(spy, 2);
    expect(await screen.findByRole("alert")).toHaveTextContent(/layanan lokasi mati/i);
  });

  it("TIMEOUT + IP fallback gagal -> arahkan coba lagi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    const spy = mockGeolocation();
    locate(spy, 3);
    expect(await screen.findByRole("alert")).toHaveTextContent(/melebihi batas waktu/i);
  });

  it("TIMEOUT + IP fallback berhasil -> tampilkan perkiraan lokasi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, latitude: -6.178, longitude: 106.63 }),
    }));
    const spy = mockGeolocation();
    const onChange = vi.fn();
    spy.mockImplementation((_ok: unknown, err: (e: { code: number }) => void) => err({ code: 3 }));
    render(<LocationPicker value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /gunakan lokasi saya/i }));
    fireEvent.click(screen.getByRole("button", { name: /^setuju/i }));
    // IP fallback berhasil → tampilkan hint, bukan error
    expect(await screen.findByText(/diperkirakan dari jaringan|estimated from.*network/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
