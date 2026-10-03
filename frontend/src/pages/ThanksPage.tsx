import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router";
import { ApiError, getThanks, topupOrder, type ThanksData } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { rupiah } from "../utils/format.ts";
import { useT } from "../i18n/t.ts";
import type { DictKey } from "../i18n/t.ts";

const POLL_MS = 5000;
const MAX_POLLS = 60;

export function ThanksPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const t = useT();
  const ref = params.get("ref") ?? "";
  const [state, setState] = useState<"loading" | "notfound" | "done">("loading");
  const [data, setData] = useState<ThanksData | null>(null);
  const [topupMsg, setTopupMsg] = useState<DictKey | "">("");
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
      <div><Header /><main className="pay-wrap"><div className="pay-card"><div className="skeleton" aria-label={t("orders.thanks.loading")} /></div></main></div>
    );
  }
  if (state === "notfound" || data === null) {
    return (
      <div>
        <Header />
        <main className="pay-wrap">
          <div className="pay-card" role="alert">
            <span className="pay-icon pay-icon--warn"><Icon name="warning" /></span>
            <h1>{t("orders.common.notFoundTitle")}</h1>
            <p>{t("orders.thanks.notFoundText")}</p>
            <Link className="btn-secondary" to="/">{t("orders.common.backHome")}</Link>
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
      setTopupMsg(e instanceof ApiError && e.code === "INVALID_TOPUP" ? "orders.thanks.topupExists" : "orders.common.topupFailed");
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
          <h1>{paid ? t("orders.thanks.titlePaid") : t("orders.thanks.titleQris")}</h1>
          <p className="pay-meta">{t("orders.thanks.codeLabel")} <strong>{data.unique_code}</strong></p>
          <p className="pay-nominal">{t("orders.thanks.payExactly")} <strong>{rupiah(data.nominal)}</strong></p>
          {paid ? (
            <>
              <p className="status-badge status-badge--ok">{t("orders.status.paid")}</p>
              <p className="pay-note">{t("orders.thanks.thanksNote")}</p>
            </>
          ) : underpaid && sisa !== null && sisa > 0 ? (
            <>
              <p className="status-badge">{t("orders.status.underpaid")}</p>
              <p className="pay-meta">{t("orders.thanks.received", { paid: rupiah(data.paid_amount ?? 0), total: rupiah(data.nominal), rest: rupiah(sisa) })}</p>
              <button type="button" className="btn-primary" disabled={topupBusy} onClick={() => void handleTopup()}>{t("orders.common.topup")}</button>
              {topupMsg !== "" ? <p className="detail-msg detail-msg--err" role="alert">{t(topupMsg)}</p> : null}
              <p className="pay-note">{t("orders.thanks.contactAdmin")}</p>
            </>
          ) : (
            <>
              {data.qr_url !== null ? <img className="qris-img" src={data.qr_url} alt={t("orders.thanks.qrAlt")} /> : null}
              <ol className="pay-steps">
                <li>{t("orders.thanks.step1")}</li>
                <li>{t("orders.thanks.step2a")} <strong>{t("orders.thanks.step2b", { amount: rupiah(data.nominal) })}</strong>{t("orders.thanks.step2c")}</li>
                <li>{t("orders.thanks.step3a")} <strong>{t("orders.status.paid")}</strong> {t("orders.thanks.step3b")}</li>
              </ol>
              <p className="status-badge">{t("orders.status.pending")}</p>
              <p className="pay-note">{t("orders.thanks.saveNote")}</p>
            </>
          )}
          <Link className="btn-secondary" to="/">{t("orders.common.backHome")}</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
