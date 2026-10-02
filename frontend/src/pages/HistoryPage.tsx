import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError, getMyOrders, topupOrder } from "../services/api.ts";
import type { HistoryOrder } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { rupiah } from "../utils/format.ts";

const FILTERS = ["semua", "pending_payment", "underpaid", "paid", "expired", "cancelled"] as const;
type Filter = (typeof FILTERS)[number];

const DOT: Record<string, string> = {
  paid: "history-dot history-dot--paid",
  underpaid: "history-dot history-dot--underpaid",
  pending_payment: "history-dot history-dot--pending",
};

const LABEL: Record<string, string> = {
  pending_payment: "Menunggu pembayaran",
  underpaid: "Kurang bayar",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("semua");
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [state, setState] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [topupMsg, setTopupMsg] = useState("");
  const [topupBusy, setTopupBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset skeleton saat filter/retry berubah
    setState("loading");
    getMyOrders(filter === "semua" ? undefined : filter)
      .then((o) => {
        if (!alive) return;
        setOrders(o);
        setState("done");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setErrorMsg(e instanceof ApiError ? e.message : "Terjadi kesalahan");
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [filter, reloadKey]);

  async function handleTopup(code: string): Promise<void> {
    setTopupBusy(true);
    setTopupMsg("");
    try {
      const child = await topupOrder(code);
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
      <main className="history-page">
        <h1>Riwayat Pesanan</h1>
        <div className="filter-bar" role="group" aria-label="Filter status">
          {FILTERS.map((f) => (
            <button key={f} type="button" className={filter === f ? "chip chip--active" : "chip"} onClick={() => setFilter(f)}>
              {f === "semua" ? "Semua" : (LABEL[f] ?? f)}
            </button>
          ))}
        </div>
        {topupMsg !== "" ? <p role="alert">{topupMsg}</p> : null}
        {state === "loading" ? (
          <div aria-label="Memuat riwayat">
            <div className="skeleton" aria-hidden="true" />
          </div>
        ) : state === "error" ? (
          <div className="state" role="alert">
            <h2>Riwayat gagal dimuat</h2>
            <p>{errorMsg}</p>
            <button type="button" className="btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
              Coba lagi
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="state" role="status">
            <h2>Belum ada pesanan</h2>
            <p>Pesanan dari perangkat ini akan tampil di sini.</p>
            <Link className="btn-secondary" to="/">Lihat menu</Link>
          </div>
        ) : (
          <ul className="history-list">
            {orders.map((o) => {
              const sisa = o.paid_amount === null ? null : o.total_amount - o.paid_amount;
              const kurang = o.status === "underpaid" && sisa !== null && sisa > 0;
              return (
                <li key={o.unique_code} className="history-row">
                  <span className={DOT[o.status] ?? "history-dot"} aria-hidden="true" />
                  <div className="history-main">
                    <p className="history-date">{fmtDate(o.created_at)}</p>
                    {o.items.length > 0 ? (
                      <ul className="history-items">
                        {o.items.map((it) => (
                          <li key={it.product_id}>{it.quantity}× {it.name}</li>
                        ))}
                      </ul>
                    ) : null}
                    <span className="history-code">{o.unique_code}</span>
                    {o.donation_consent ? <span className="tag">Donasi disetujui</span> : null}
                  </div>
                  <div className="history-side">
                    <span className="history-total">{rupiah(o.total_amount)}</span>
                    <span className="status-badge">{LABEL[o.status] ?? o.status}</span>
                    {o.paid_amount !== null ? <p className="history-sub">Dibayar {rupiah(o.paid_amount)}</p> : null}
                    {kurang ? <p className="history-sub history-sub--warn">Kurang {rupiah(sisa)}</p> : null}
                    <div className="history-actions">
                      {o.status === "underpaid" && o.parent_code === null ? (
                        <button type="button" className="btn-primary btn-sm" disabled={topupBusy} onClick={() => void handleTopup(o.unique_code)}>
                          Bayar sisa
                        </button>
                      ) : null}
                      <Link className="btn-secondary btn-sm" to={`/status/${encodeURIComponent(o.unique_code)}`}>Lacak</Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
