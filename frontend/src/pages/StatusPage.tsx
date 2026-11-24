import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ApiError, getThanks, topupOrder, type ThanksData } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { rupiah } from "../utils/format.ts";
import { queueNo } from "../utils/queue.ts";
import { useT } from "../i18n/t.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import type { DictKey } from "../i18n/t.ts";
import { Sprite } from "../pixel/Sprite.tsx";
import { PAPER_BAG_OPEN, SHOP_BELL, CASH_REGISTER, OVEN } from "../pixel/data/bakeryB.ts";
import { TOAST_BURNT } from "../pixel/data/mascot2.ts";
import { CAT_HEAD } from "../pixel/data/mascot.ts";
import { OrderStepper } from "../components/OrderStepper.tsx";
import { STATUS_LABEL, fulfilIndex } from "../utils/orderFlow.ts";

const POLL_MS = 5000;
const MAX_POLLS = 60;

export function StatusPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const t = useT();
  usePageTitle(t("orders.status.title"));
  const ref = code ?? "";
  const [state, setState] = useState<"loading" | "notfound" | "done">("loading");
  const [data, setData] = useState<ThanksData | null>(null);
  const [topupMsg, setTopupMsg] = useState<DictKey | "">("");
  const [topupBusy, setTopupBusy] = useState(false);
  const [connIssue, setConnIssue] = useState(false);
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
        setConnIssue(false);
        setState("done");
        // Berhenti polling pada status final atau batas maksimum.
        if (d.status === "done" || d.status === "cancelled" || d.status === "expired" || polls.current >= MAX_POLLS) {
          if (timer !== null) clearInterval(timer);
        }
      } catch (e: unknown) {
        if (!alive) return;
        if (e instanceof ApiError && e.code === "NOT_FOUND") {
          setState("notfound");
          if (timer !== null) clearInterval(timer);
        } else {
          setConnIssue(true); // gangguan sesaat/429: tetap coba lagi, jangan biarkan halaman kosong
        }
      }
    }

    void tick();
    timer = setInterval(() => { polls.current += 1; void tick(); }, POLL_MS);
    return () => { alive = false; if (timer !== null) clearInterval(timer); };
  }, [ref]);

  if (state === "loading") {
    return <div><Header /><main id="main" tabIndex={-1} className="pay-wrap"><div className="pay-card"><div className="skeleton" aria-label={t("orders.status.loading")} />{connIssue ? <p className="detail-msg detail-msg--err" role="status">{t("orders.common.reconnecting")}</p> : null}</div></main></div>;
  }
  if (state === "notfound") {
    return (
      <div>
        <Header />
        <main id="main" tabIndex={-1} className="pay-wrap">
          <div className="pay-card" role="alert">
            <span className="pay-icon pay-icon--warn"><Icon name="warning" /></span>
            <h1>{t("orders.common.notFoundTitle")}</h1>
            <p>{t("orders.common.notFoundHint")}</p>
            <Link className="btn-primary" to="/riwayat">{t("orders.common.toHistory")}</Link>
            <Link className="btn-secondary" to="/">{t("orders.common.backHome")}</Link>
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
        <main id="main" tabIndex={-1} className="pay-wrap">
          <div className="pay-card" role="alert">
            <span className="pay-icon pay-icon--warn"><Icon name="warning" /></span>
            <h1>{t("orders.common.notFoundTitle")}</h1>
            <p>{t("orders.common.notFoundHint")}</p>
            <Link className="btn-primary" to="/riwayat">{t("orders.common.toHistory")}</Link>
            <Link className="btn-secondary" to="/">{t("orders.common.backHome")}</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  const status = data?.status ?? "";
  const paid = fulfilIndex(status) >= 0;
  const underpaid = status === "underpaid";
  const sisa = data?.paid_amount === null || data?.paid_amount === undefined || data === null ? null : data.nominal - data.paid_amount;
  const label = t(STATUS_LABEL[status] ?? "orders.status.pending");
  // Ilustrasi status: kantong terbuka (lunas), kasir (kurang bayar), roti gosong (batal), lonceng (menunggu).
  const explain: DictKey = status === "preparing" ? "orders.status.explain.preparing" : status === "ready" ? "orders.status.explain.ready" : status === "done" ? "orders.status.explain.done" : paid ? "orders.status.explain.paid" : status === "cancelled" ? "orders.status.explain.cancelled" : status === "expired" ? "orders.status.explain.expired" : underpaid ? "orders.status.explain.underpaid" : "orders.status.explain.pending";
  const stageSprite = status === "preparing" ? OVEN : status === "done" ? CAT_HEAD : paid ? PAPER_BAG_OPEN : status === "cancelled" || status === "expired" ? TOAST_BURNT : underpaid ? CASH_REGISTER : SHOP_BELL;

  async function handleTopup(): Promise<void> {
    setTopupBusy(true);
    setTopupMsg("");
    try {
      const child = await topupOrder(ref);
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
      <main id="main" tabIndex={-1} className="pay-wrap">
        <div className="pay-card" role="status">
          {connIssue ? <p className="detail-msg detail-msg--err" role="status">{t("orders.common.reconnecting")}</p> : null}
          <Sprite sprite={stageSprite} className="status-sprite" />
          <h1>{t("orders.status.title")}</h1>
          {queueNo(data?.order_id) !== null ? <p className="queue-no"><span>{t("orders.queue.label")}</span> <strong>{queueNo(data?.order_id)}</strong></p> : null}
          <p className="pay-meta">{t("orders.status.codeLabel")} <strong>{ref}</strong></p>
          <p className="status-badge">{label}</p>
          <OrderStepper status={status} />
          <p className="pay-note">{t(explain)}</p>
          {status === "pending_payment" ? <Link className="btn-primary" to={`/thanks?ref=${encodeURIComponent(ref)}`}>{t("orders.status.payNow")}</Link> : null}
          {underpaid && sisa !== null && sisa > 0 ? (
            <>
              <p className="pay-meta">{t("orders.common.shortBy", { amount: rupiah(sisa) })}</p>
              <button type="button" className="btn-primary" disabled={topupBusy} onClick={() => void handleTopup()}>{t("orders.common.topup")}</button>
              {topupMsg !== "" ? <p className="detail-msg detail-msg--err" role="alert">{t(topupMsg)}</p> : null}
            </>
          ) : null}
          <Link className="btn-secondary" to="/riwayat">{t("orders.thanks.history")}</Link>
          <Link className="btn-link" to="/">{t("orders.common.backHome")}</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
