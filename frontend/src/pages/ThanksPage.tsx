import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { ApiError, getThanks, type ThanksData } from "../services/api.ts";
import { rupiah } from "../utils/format.ts";

export function ThanksPage() {
  const [params] = useSearchParams();
  const ref = params.get("ref") ?? "";
  const [state, setState] = useState<"loading" | "notfound" | "done">("loading");
  const [data, setData] = useState<ThanksData | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkronisasi state eksternal (query ref) + async fetch
    if (ref === "") { setState("notfound"); return; }
    let alive = true;
    getThanks(ref)
      .then((d) => { if (alive) { setData(d); setState("done"); } })
      // Sesi lain / ref tak ada -> 404 seragam dari server.
      .catch((e: unknown) => { if (alive) setState(e instanceof ApiError ? "notfound" : "notfound"); });
    return () => { alive = false; };
  }, [ref]);

  if (state === "loading") {
    return <main className="state"><div className="skeleton" aria-label="Memuat" /></main>;
  }
  if (state === "notfound" || data === null) {
    return (
      <main className="state" role="alert">
        <h1>Pesanan tidak ditemukan</h1>
        <p>Tautan tidak berlaku untuk sesi ini.</p>
        <Link className="btn-secondary" to="/">Kembali ke beranda</Link>
      </main>
    );
  }
  return (
    <main className="state">
      <h1>Pembayaran QRIS</h1>
      <p>Kode: <strong>{data.unique_code}</strong></p>
      <p>Nominal: <strong>{rupiah(data.nominal)}</strong></p>
      {data.qr_url !== null ? <img className="qris-img" src={data.qr_url} alt="QRIS pembayaran" /> : null}
      <p>Status: {data.status === "paid" ? "Lunas" : "Menunggu pembayaran"}</p>
      <Link className="btn-secondary" to="/">Kembali ke beranda</Link>
    </main>
  );
}
