import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { ApiError, getThanks, type ThanksData } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
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
    return (
      <div><Header /><main className="pay-wrap"><div className="pay-card"><div className="skeleton" aria-label="Memuat" /></div></main></div>
    );
  }
  if (state === "notfound" || data === null) {
    return (
      <div>
        <Header />
        <main className="pay-wrap">
          <div className="pay-card" role="alert">
            <span className="pay-icon pay-icon--warn"><Icon name="warning" /></span>
            <h1>Pesanan tidak ditemukan</h1>
            <p>Tautan tidak berlaku untuk sesi ini.</p>
            <Link className="btn-secondary" to="/">Kembali ke beranda</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  const paid = data.status === "paid";
  return (
    <div>
      <Header />
      <main className="pay-wrap">
        <div className="pay-card">
          <span className={paid ? "pay-icon pay-icon--ok" : "pay-icon"}><Icon name={paid ? "check" : "clock"} /></span>
          <h1>{paid ? "Pembayaran diterima" : "Pembayaran QRIS"}</h1>
          <p className="pay-meta">Kode pesanan: <strong>{data.unique_code}</strong></p>
          <p className="pay-nominal">Bayar tepat <strong>{rupiah(data.nominal)}</strong></p>
          {paid ? (
            <>
              <p className="status-badge status-badge--ok">Lunas</p>
              <p className="pay-note">Terima kasih! Pesanan Anda sedang kami proses.</p>
            </>
          ) : (
            <>
              {data.qr_url !== null ? <img className="qris-img" src={data.qr_url} alt="QRIS pembayaran Serenity" /> : null}
              <ol className="pay-steps">
                <li>Scan QRIS di atas dengan aplikasi e-wallet / m-banking (GoPay, OVO, DANA, bank, dll).</li>
                <li>Masukkan nominal <strong>persis {rupiah(data.nominal)}</strong>. Nominal yang berbeda membuat pesanan sulit dikonfirmasi.</li>
                <li>Selesaikan pembayaran, lalu tunggu — status berubah jadi <strong>Lunas</strong> setelah transaksi terverifikasi (max. 5-30 menit).</li>
              </ol>
              <p className="status-badge">Menunggu pembayaran</p>
              <p className="pay-note">Simpan halaman ini atau catat kode pesanan untuk konfirmasi.</p>
            </>
          )}
          <Link className="btn-secondary" to="/">Kembali ke beranda</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
