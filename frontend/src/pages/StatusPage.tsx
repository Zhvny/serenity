import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ApiError, getThanks, topupOrder, type ThanksData } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { rupiah } from "../utils/format.ts";

const POLL_MS = 5000;
const MAX_POLLS = 60;

export function StatusPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const ref = code ?? "";
  const [state, setState] = useState<"loading" | "notfound" | "done">("loading");
  const [data, setData] = useState<ThanksData | null>(null);
  const [topupMsg, setTopupMsg] = useState("");
  const [topupBusy, setTopupBusy] = useState(false);
  const polls = useRef(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkronisasi param kosong + polling async
    if (ref === "") { setState("notfound"); return; }
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    async function tick(): Promise<void> {
      try {
        const d = await getThanks(ref);
        if (!alive) return;
        setData(d);
        setState("done");
        // Berhenti polling pada status final atau batas maksimum.
        if (d.status === "paid" || d.status === "cancelled" || polls.current >= MAX_POLLS) {
          if (timer !== null) clearInterval(timer);
        }
      } catch (e: unknown) {
        if (!alive) return;
        if (e instanceof ApiError && e.code === "NOT_FOUND") {
          setState("notfound");
          if (timer !== null) clearInterval(timer);
        }
      }
    }

    void tick();
    timer = setInterval(() => { polls.current += 1; void tick(); }, POLL_MS);
    return () => { alive = false; if (timer !== null) clearInterval(timer); };
  }, [ref]);

  if (state === "loading") {
    return <div><Header /><main className="pay-wrap"><div className="pay-card"><div className="skeleton" aria-label="Memuat status" /></div></main></div>;
  }
  if (state === "notfound") {
    return (
      <div>
        <Header />
        <main className="pay-wrap">
          <div className="pay-card" role="alert">
            <span className="pay-icon pay-icon--warn"><Icon name="warning" /></span>
            <h1>Pesanan tidak ditemukan</h1>
            <Link className="btn-secondary" to="/">Kembali ke beranda</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  if (state === "done" && data === null) {
    return (
      <div>
        <Header />
        <main className="pay-wrap">
          <div className="pay-card" role="alert">
            <span className="pay-icon pay-icon--warn"><Icon name="warning" /></span>
            <h1>Pesanan tidak ditemukan</h1>
            <Link className="btn-secondary" to="/">Kembali ke beranda</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  const status = data?.status ?? "";
  const paid = status === "paid";
  const underpaid = status === "underpaid";
  const sisa = data?.paid_amount === null || data?.paid_amount === undefined || data === null ? null : data.nominal - data.paid_amount;
  const label = paid ? "Dibayar (Lunas)" : status === "cancelled" ? "Dibatalkan" : underpaid ? "Kurang bayar" : "Menunggu pembayaran";
  const icon = paid ? "check" : status === "cancelled" ? "warning" : "clock";

  async function handleTopup(): Promise<void> {
    setTopupBusy(true);
    setTopupMsg("");
    try {
      const child = await topupOrder(ref);
      navigate(`/thanks?ref=${encodeURIComponent(child.unique_code)}`);
    } catch (e: unknown) {
      setTopupMsg(e instanceof ApiError ? "Top-up tidak dapat dibuat. Muat ulang halaman." : "Gagal membuat kode top-up.");
    } finally {
      setTopupBusy(false);
    }
  }

  return (
    <div>
      <Header />
      <main className="pay-wrap">
        <div className="pay-card" role="status">
          <span className={paid ? "pay-icon pay-icon--ok" : "pay-icon"}><Icon name={icon} /></span>
          <h1>Status Pesanan</h1>
          <p className="pay-meta">Kode: <strong>{ref}</strong></p>
          <p className="status-badge">{label}</p>
          {underpaid && sisa !== null && sisa > 0 ? (
            <>
              <p className="pay-meta">Kurang {rupiah(sisa)}</p>
              <button type="button" className="btn-primary" disabled={topupBusy} onClick={() => void handleTopup()}>Buat kode top-up</button>
              {topupMsg !== "" ? <p className="detail-msg detail-msg--err" role="alert">{topupMsg}</p> : null}
            </>
          ) : null}
          <Link className="btn-secondary" to="/">Kembali ke beranda</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
