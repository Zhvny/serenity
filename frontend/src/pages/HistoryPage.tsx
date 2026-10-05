import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError, getMyOrders, topupOrder } from "../services/api.ts";
import type { HistoryOrder } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { rupiah } from "../utils/format.ts";
import { useT } from "../i18n/t.ts";
import type { DictKey } from "../i18n/t.ts";
import { useLang } from "../i18n/useLang.ts";
import { localeOf } from "../i18n/store.ts";

const FILTERS = ["semua", "pending_payment", "underpaid", "paid", "expired", "cancelled"] as const;
type Filter = (typeof FILTERS)[number];

const DOT: Record<string, string> = {
  paid: "history-dot history-dot--paid",
  underpaid: "history-dot history-dot--underpaid",
  pending_payment: "history-dot history-dot--pending",
};

const LABEL: Record<string, DictKey> = {
  pending_payment: "orders.status.pending",
  underpaid: "orders.status.underpaid",
  paid: "orders.status.paid",
  expired: "orders.status.expired",
  cancelled: "orders.status.cancelled",
};

function fmtDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export function HistoryPage() {
  const navigate = useNavigate();
  const t = useT();
  const [lang] = useLang();
  const locale = localeOf(lang);
  const [filter, setFilter] = useState<Filter>("semua");
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [state, setState] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [topupMsg, setTopupMsg] = useState<DictKey | "">("");
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
        setErrorMsg(e instanceof ApiError ? e.message : null);
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
      setTopupMsg(e instanceof ApiError ? "orders.common.topupUnavailable" : "orders.common.topupFailed");
    } finally {
      setTopupBusy(false);
    }
  }

  return (
    <div>
      <Header />
      <main className="history-page">
        <h1>{t("orders.history.title")}</h1>
        <div className="filter-bar" role="group" aria-label={t("orders.history.filterLabel")}>
          {FILTERS.map((f) => (
            <button key={f} type="button" className={filter === f ? "chip chip--active" : "chip"} onClick={() => setFilter(f)}>
              {f === "semua" ? t("orders.history.all") : (LABEL[f] !== undefined ? t(LABEL[f]) : f)}
            </button>
          ))}
        </div>
        {topupMsg !== "" ? <p role="alert">{t(topupMsg)}</p> : null}
        {state === "loading" ? (
          <div aria-label={t("orders.history.loading")}>
            <div className="skeleton" aria-hidden="true" />
          </div>
        ) : state === "error" ? (
          <div className="state" role="alert">
            <h2>{t("orders.history.errorTitle")}</h2>
            <p>{errorMsg ?? t("orders.history.errorGeneric")}</p>
            <button type="button" className="btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
              {t("orders.history.retry")}
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="state" role="status">
            <h2>{t("orders.history.emptyTitle")}</h2>
            <p>{t("orders.history.emptyText")}</p>
            <Link className="btn-secondary" to="/menu">{t("orders.history.viewMenu")}</Link>
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
                    <p className="history-date">{fmtDate(o.created_at, locale)}</p>
                    {o.items.length > 0 ? (
                      <ul className="history-items">
                        {o.items.map((it) => (
                          <li key={it.product_id}>{it.quantity}× {it.name}</li>
                        ))}
                      </ul>
                    ) : null}
                    <span className="history-code">{o.unique_code}</span>
                    {o.donation_consent ? <span className="tag">{t("orders.history.donation")}</span> : null}
                  </div>
                  <div className="history-side">
                    <span className="history-total">{rupiah(o.total_amount)}</span>
                    <span className="status-badge">{LABEL[o.status] !== undefined ? t(LABEL[o.status]) : o.status}</span>
                    {o.paid_amount !== null ? <p className="history-sub">{t("orders.history.paidAmount", { amount: rupiah(o.paid_amount) })}</p> : null}
                    {kurang ? <p className="history-sub history-sub--warn">{t("orders.common.shortBy", { amount: rupiah(sisa) })}</p> : null}
                    <div className="history-actions">
                      {o.status === "underpaid" && o.parent_code === null ? (
                        <button type="button" className="btn-primary btn-sm" disabled={topupBusy} onClick={() => void handleTopup(o.unique_code)}>
                          {t("orders.history.payRest")}
                        </button>
                      ) : null}
                      <Link className="btn-secondary btn-sm" to={`/status/${encodeURIComponent(o.unique_code)}`}>{t("orders.history.track")}</Link>
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
