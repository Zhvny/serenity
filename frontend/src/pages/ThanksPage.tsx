import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router";
import { ApiError, getThanks, topupOrder, type ThanksData } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { rupiah } from "../utils/format.ts";
import { queueNo } from "../utils/queue.ts";
import { OrderStepper } from "../components/OrderStepper.tsx";
import { STATUS_LABEL, fulfilIndex } from "../utils/orderFlow.ts";
import { useT } from "../i18n/t.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import type { DictKey } from "../i18n/t.ts";

const POLL_MS = 5000;
const MAX_POLLS = 60;

export function ThanksPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const t = useT();
  usePageTitle(t("orders.thanks.titleQris"));
  const ref = params.get("ref") ?? "";
  const [state, setState] = useState<"loading" | "notfound" | "done">("loading");
  const [data, setData] = useState<ThanksData | null>(null);
  const [topupMsg, setTopupMsg] = useState<DictKey | "">("");
  const [topupBusy, setTopupBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [connIssue, setConnIssue] = useState(false);
  const polls = useRef(0);

  function handleCopyAccount(): void {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText("7615560677").then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

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
        setConnIssue(false);
        setState("done");
        // Hentikan polling pada status final / batas maksimum (hindari spam BE).
        if (d.status === "done" || d.status === "cancelled" || d.status === "expired" || polls.current >= MAX_POLLS) {
          if (timer !== null) clearInterval(timer);
        }
      } catch (e: unknown) {
        if (!alive) return;
        // Hanya "tidak ditemukan" sungguhan yang mengganti halaman. Gangguan jaringan/429/5xx sesaat:
        // pertahankan data yang ada dan lanjut polling (pulih sendiri saat koneksi kembali).
        if (e instanceof ApiError && (e.code === "NOT_FOUND" || e.code === "ORDER_NOT_FOUND")) {
          setState("notfound");
          if (timer !== null) clearInterval(timer);
        } else {
          setConnIssue(true);
        }
      }
    }

    void tick();
    timer = setInterval(() => { polls.current += 1; void tick(); }, POLL_MS);
    return () => { alive = false; if (timer !== null) clearInterval(timer); };
  }, [ref]);

  if (state === "loading") {
    return (
      <div><Header /><main id="main" tabIndex={-1} className="pay-wrap"><div className="pay-card"><div className="skeleton" aria-label={t("orders.thanks.loading")} />{connIssue ? <p className="detail-msg detail-msg--err" role="status">{t("orders.common.reconnecting")}</p> : null}</div></main></div>
    );
  }
  if (state === "notfound" || data === null) {
    return (
      <div>
        <Header />
        <main id="main" tabIndex={-1} className="pay-wrap">
          <div className="pay-card" role="alert">
            <span className="pay-icon pay-icon--warn"><Icon name="warning" /></span>
            <h1>{t("orders.common.notFoundTitle")}</h1>
            <p>{t("orders.thanks.notFoundText")}</p>
            <p>{t("orders.common.notFoundHint")}</p>
            <Link className="btn-primary" to="/riwayat">{t("orders.common.toHistory")}</Link>
            <Link className="btn-secondary" to="/">{t("orders.common.backHome")}</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  const paid = fulfilIndex(data.status) >= 0;
  const underpaid = data.status === "underpaid";
  const sisa = data.paid_amount === null || data.paid_amount === undefined ? null : data.nominal - data.paid_amount;

  async function copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(data?.unique_code ?? ref);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch { /* clipboard tak tersedia: kode tetap terlihat di layar */ }
  }

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
      <main id="main" tabIndex={-1} className="pay-wrap">
        <div className="pay-card">
          {connIssue ? <p className="detail-msg detail-msg--err" role="status">{t("orders.common.reconnecting")}</p> : null}
          <span className={paid ? "pay-icon pay-icon--ok" : "pay-icon"}><Icon name={paid ? "check" : "clock"} /></span>
          <h1>{paid ? t("orders.thanks.titlePaid") : t("orders.thanks.titleQris")}</h1>
          {queueNo(data.order_id) !== null ? <p className="queue-no"><span>{t("orders.queue.label")}</span> <strong>{queueNo(data.order_id)}</strong></p> : null}
          <p className="pay-meta">{t("orders.thanks.codeLabel")} <strong>{data.unique_code}</strong></p>
          {data.delivery_method ? (
            <p className="pay-meta">
              {t("orders.thanks.method")} <strong>{data.delivery_method === "delivery" ? t("shop.cart.method.delivery") : t("shop.cart.method.pickup")}</strong>
            </p>
          ) : null}
          {data.mode === "scheduled" && data.scheduled_at ? (
            <p className="pay-meta">
              {t("orders.thanks.schedule")} <strong>{new Date(data.scheduled_at).toLocaleString()}</strong>
            </p>
          ) : null}
          {data.delivery_method === "delivery" && data.delivery_address ? (
            <p className="pay-meta">
              {t("orders.thanks.address")} <strong>{data.delivery_address}</strong>
            </p>
          ) : null}
          {data.delivery_fee !== null && data.delivery_fee !== undefined ? (
            <p className="pay-meta">
              {t("orders.history.shipFee", { amount: rupiah(data.delivery_fee) })}
              {data.delivery_receipt_url ? (
                <> · <a href={data.delivery_receipt_url} target="_blank" rel="noopener noreferrer" className="history-receipt-link"><Icon name="receipt" /> {t("orders.history.viewReceipt")}</a></>
              ) : null}
            </p>
          ) : null}
          {data.status === "cancelled" && data.cancel_reason ? (
            <div className="cancel-reason-box" role="alert">
              <strong>{t("orders.common.cancelReason")}:</strong> {data.cancel_reason}
            </div>
          ) : null}
          <p className="pay-nominal">{t("orders.thanks.payExactly")} <strong>{rupiah(data.nominal)}</strong></p>
          {paid ? (
            <>
              <p className="status-badge status-badge--ok">{t(STATUS_LABEL[data.status] ?? "orders.status.paid")}</p>
              <OrderStepper status={data.status} />
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
              <div className="bank-box" aria-label="Informasi Transfer Rekening BCA">
                <div className="bank-row">
                  <span className="bank-label">Bank</span>
                  <strong className="bank-val">BCA</strong>
                </div>
                <div className="bank-row">
                  <span className="bank-label">{t("orders.thanks.bankAccountLabel")}</span>
                  <div className="bank-val-wrap">
                    <strong className="bank-val">7615560677</strong>
                    <button type="button" className="btn-secondary btn-sm btn-copy" onClick={handleCopyAccount}>
                      {copied ? t("orders.thanks.copied") : t("orders.thanks.copy")}
                    </button>
                  </div>
                </div>
                <div className="bank-row">
                  <span className="bank-label">{t("orders.thanks.bankAccountName")}</span>
                  <strong className="bank-val">Fransiskus Xaverius Kevin</strong>
                </div>
              </div>
              <ol className="pay-steps">
                <li>{t("orders.thanks.step1")}</li>
                <li>{t("orders.thanks.step2a")} <strong>{t("orders.thanks.step2b", { amount: rupiah(data.nominal) })}</strong>{t("orders.thanks.step2c")}</li>
                <li>{t("orders.thanks.step3a")} <strong>{t("orders.status.paid")}</strong> {t("orders.thanks.step3b")}</li>
              </ol>
              <p className="status-badge">{t("orders.status.pending")}</p>
              <p className="pay-note">{t("orders.thanks.expiry")}</p>
            </>
          )}
          <p className="pay-note">{t("orders.thanks.deviceNote")}</p>
          <div className="pay-links">
            <Link className="btn-primary pay-btn-track" to={`/status/${encodeURIComponent(data.unique_code)}`}>
              {t("orders.thanks.track")}
            </Link>
            <div className="pay-btn-row">
              <button type="button" className="btn-secondary pay-btn-sub" onClick={() => void copyCode()}>
                {codeCopied ? t("orders.thanks.copied") : t("orders.thanks.copyCode")}
              </button>
              <Link className="btn-secondary pay-btn-sub" to="/riwayat">
                {t("orders.thanks.history")}
              </Link>
            </div>
          </div>
          <Link className="btn-link" to="/">{t("orders.common.backHome")}</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
