import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router";
import { ApiError, getThanks } from "../services/api.ts";

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
    return <main className="state"><div className="skeleton" aria-label="Memuat status" /></main>;
  }
  if (state === "notfound") {
    return (
      <main className="state" role="alert">
        <h1>Pesanan tidak ditemukan</h1>
        <Link className="btn-secondary" to="/">Kembali ke beranda</Link>
      </main>
    );
  }
  const label = status === "paid" ? "Dibayar (Lunas)" : status === "cancelled" ? "Dibatalkan" : "Menunggu pembayaran";
  return (
    <main className="state" role="status">
      <h1>Status Pesanan</h1>
      <p>Kode: <strong>{ref}</strong></p>
      <p className="status-badge">{label}</p>
      <Link className="btn-secondary" to="/">Kembali ke beranda</Link>
    </main>
  );
}
