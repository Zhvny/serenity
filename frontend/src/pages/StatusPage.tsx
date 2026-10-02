import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import { ApiError, getThanks } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";

const POLL_MS = 5000;
const MAX_POLLS = 60;

export function StatusPage() {
  const { code } = useParams();
  const ref = code ?? "";
  const [state, setState] = useState<"loading" | "notfound" | "done">("loading");
  const [status, setStatus] = useState<string>("");
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
        setStatus(d.status);
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
  const paid = status === "paid";
  const label = paid ? "Dibayar (Lunas)" : status === "cancelled" ? "Dibatalkan" : status === "underpaid" ? "Kurang bayar" : "Menunggu pembayaran";
  const icon = paid ? "check" : status === "cancelled" ? "warning" : "clock";
  return (
    <div>
      <Header />
      <main className="pay-wrap">
        <div className="pay-card" role="status">
          <span className={paid ? "pay-icon pay-icon--ok" : "pay-icon"}><Icon name={icon} /></span>
          <h1>Status Pesanan</h1>
          <p className="pay-meta">Kode: <strong>{ref}</strong></p>
          <p className="status-badge">{label}</p>
          <Link className="btn-secondary" to="/">Kembali ke beranda</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
