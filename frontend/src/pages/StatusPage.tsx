import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { ApiError, getThanks, topupOrder, type ThanksData } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { rupiah } from "../utils/format.ts";
import { useT } from "../i18n/t.ts";
import type { DictKey } from "../i18n/t.ts";
import { Sprite } from "../pixel/Sprite.tsx";
import { PAPER_BAG_OPEN, SHOP_BELL, CASH_REGISTER } from "../pixel/data/bakeryB.ts";
import { TOAST_BURNT } from "../pixel/data/mascot2.ts";

const POLL_MS = 5000;
const MAX_POLLS = 60;

export function StatusPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const ref = code ?? "";
  const [state, setState] = useState<"loading" | "notfound" | "done">("loading");
  const [data, setData] = useState<ThanksData | null>(null);
  const [topupMsg, setTopupMsg] = useState<DictKey | "">("");
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
    return <div><Header /><main className="pay-wrap"><div className="pay-card"><div className="skeleton" aria-label={t("orders.status.loading")} /></div></main></div>;
  }
  if (state === "notfound") {
    return (
      <div>
        <Header />
        <main className="pay-wrap">
          <div className="pay-card" role="alert">
            <span className="pay-icon pay-icon--warn"><Icon name="warning" /></span>
            <h1>{t("orders.common.notFoundTitle")}</h1>
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
        <main className="pay-wrap">
          <div className="pay-card" role="alert">
            <span className="pay-icon pay-icon--warn"><Icon name="warning" /></span>
            <h1>{t("orders.common.notFoundTitle")}</h1>
            <Link className="btn-secondary" to="/">{t("orders.common.backHome")}</Link>
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
  const label = paid ? t("orders.status.paidFull") : status === "cancelled" ? t("orders.status.cancelled") : underpaid ? t("orders.status.underpaid") : t("orders.status.pending");
  // Ilustrasi status: kantong terbuka (lunas), kasir (kurang bayar), roti gosong (batal), lonceng (menunggu).
  const stageSprite = paid ? PAPER_BAG_OPEN : status === "cancelled" ? TOAST_BURNT : underpaid ? CASH_REGISTER : SHOP_BELL;

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
      <main className="pay-wrap">
        <div className="pay-card" role="status">
          <Sprite sprite={stageSprite} className="status-sprite" />
          <h1>{t("orders.status.title")}</h1>
          <p className="pay-meta">{t("orders.status.codeLabel")} <strong>{ref}</strong></p>
          <p className="status-badge">{label}</p>
          {underpaid && sisa !== null && sisa > 0 ? (
            <>
              <p className="pay-meta">{t("orders.common.shortBy", { amount: rupiah(sisa) })}</p>
              <button type="button" className="btn-primary" disabled={topupBusy} onClick={() => void handleTopup()}>{t("orders.common.topup")}</button>
              {topupMsg !== "" ? <p className="detail-msg detail-msg--err" role="alert">{t(topupMsg)}</p> : null}
            </>
          ) : null}
          <Link className="btn-secondary" to="/">{t("orders.common.backHome")}</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
