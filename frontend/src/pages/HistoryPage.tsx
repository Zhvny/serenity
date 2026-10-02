import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError, getMyOrders, topupOrder } from "../services/api.ts";
import type { HistoryOrder } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { rupiah } from "../utils/format.ts";

const FILTERS = ["semua", "pending_payment", "underpaid", "paid", "expired", "cancelled"] as const;
type Filter = (typeof FILTERS)[number];

const LABEL: Record<string, string> = {
  pending_payment: "Menunggu pembayaran",
  underpaid: "Kurang bayar",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
};

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
      <main>
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
          <div className="grid-menu">
            {orders.map((o) => {
              const sisa = o.paid_amount === null ? null : o.total_amount - o.paid_amount;
              return (
                <article key={o.unique_code} className="product-card">
                  <h3>{o.unique_code}</h3>
                  {o.items.length > 0 ? (
                    <ul>
                      {o.items.map((it) => (
                        <li key={it.product_id}>{it.quantity}× {it.name}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="price">{rupiah(o.total_amount)}</p>
                  <p><span className="status-badge">{LABEL[o.status] ?? o.status}</span></p>
                  {o.paid_amount !== null ? <p>Dibayar {rupiah(o.paid_amount)} dari {rupiah(o.total_amount)}</p> : null}
                  {o.status === "underpaid" && sisa !== null && sisa > 0 ? (
                    <p>Kurang {rupiah(sisa)}</p>
                  ) : null}
                  {o.donation_consent ? <p><span className="tag">Donasi disetujui</span></p> : null}
                  <div className="tags">
                    {o.status === "underpaid" && o.parent_code === null ? (
                      <button type="button" className="btn-primary btn-sm" disabled={topupBusy} onClick={() => void handleTopup(o.unique_code)}>
                        Bayar sisa
                      </button>
                    ) : null}
                    <Link className="btn-secondary btn-sm" to={`/status/${encodeURIComponent(o.unique_code)}`}>Lacak</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
