import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router";
import { ApiError, getThanks, topupOrder, type ThanksData } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { rupiah } from "../utils/format.ts";

const POLL_MS = 5000;
const MAX_POLLS = 60;

export function ThanksPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ref = params.get("ref") ?? "";
  const [state, setState] = useState<"loading" | "notfound" | "done">("loading");
  const [data, setData] = useState<ThanksData | null>(null);
  const [topupMsg, setTopupMsg] = useState("");
  const [topupBusy, setTopupBusy] = useState(false);
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
  const underpaid = data.status === "underpaid";
  const sisa = data.paid_amount === null || data.paid_amount === undefined ? null : data.nominal - data.paid_amount;

  async function handleTopup(): Promise<void> {
    setTopupBusy(true);
    setTopupMsg("");
    try {
      const child = await topupOrder(ref);
      navigate(`/thanks?ref=${encodeURIComponent(child.unique_code)}`);
    } catch (e: unknown) {
      setTopupMsg(e instanceof ApiError && e.code === "INVALID_TOPUP" ? "Kode top-up sudah ada. Hubungi admin." : "Gagal membuat kode top-up.");
    } finally {
      setTopupBusy(false);
    }
  }
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
          ) : underpaid && sisa !== null && sisa > 0 ? (
            <>
              <p className="status-badge">Kurang bayar</p>
              <p className="pay-meta">Masuk {rupiah(data.paid_amount ?? 0)} dari {rupiah(data.nominal)} — Kurang {rupiah(sisa)}</p>
              <button type="button" className="btn-primary" disabled={topupBusy} onClick={() => void handleTopup()}>Buat kode top-up</button>
              {topupMsg !== "" ? <p className="detail-msg detail-msg--err" role="alert">{topupMsg}</p> : null}
              <p className="pay-note">Atau hubungi admin untuk bantuan.</p>
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
