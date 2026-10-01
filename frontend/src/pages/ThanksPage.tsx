import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { ApiError, getThanks, type ThanksData } from "../services/api.ts";
import { rupiah } from "../utils/format.ts";

const POLL_MS = 5000;
const MAX_POLLS = 60;

export function ThanksPage() {
  const [params] = useSearchParams();
  const ref = params.get("ref") ?? "";
  const [state, setState] = useState<"loading" | "notfound" | "done">("loading");
  const [data, setData] = useState<ThanksData | null>(null);
  const polls = useRef(0);

  useEffect(() => {
    if (ref === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkronisasi query ref kosong
      setState("notfound");
      return;
    }
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function tick(): Promise<void> {
      try {
        const d = await getThanks(ref);
        if (!alive) return;
        setData(d);
        setState("done");
        // Hentikan polling pada status final / batas maksimum (hindari spam BE).
        if (d.status === "paid" || d.status === "cancelled" || polls.current >= MAX_POLLS) {
          if (timer !== null) clearInterval(timer);
        }
      } catch (e: unknown) {
        if (!alive) return;
        setState("notfound");
        if (timer !== null) clearInterval(timer);
        void (e as ApiError);
      }
    }

    void tick();
    timer = setInterval(() => { polls.current += 1; void tick(); }, POLL_MS);
    return () => { alive = false; if (timer !== null) clearInterval(timer); };
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
