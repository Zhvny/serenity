import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError, generateCode } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { tNow, useT } from "../i18n/t.ts";

// Jeda paksa baca sebelum checkbox aktif (detik).
export const CONSENT_DELAY_S = 5;

export function CheckoutPage() {
  const t = useT();
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [consent, setConsent] = useState(false);
  const [waitLeft, setWaitLeft] = useState(CONSENT_DELAY_S);

  // Interval tunggal (bukan timeout berantai): tiap detik kurang 1 hingga 0.
  // Interval tak bergantung effect re-run sehingga aman di fake-timer.
  useEffect(() => {
    const timer = setInterval(() => setWaitLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  async function handlePay(): Promise<void> {
    setState("sending");
    setMsg("");
    try {
      const { unique_code } = await generateCode(consent);
      window.dispatchEvent(new Event("cart:changed"));
      navigate(`/thanks?ref=${encodeURIComponent(unique_code)}`);
    } catch (e: unknown) {
      setMsg(e instanceof ApiError ? e.message : tNow("shop.pay.error"));
      setState("error");
    }
  }

  return (
    <div>
      <Header />
      <main className="pay-wrap">
        <div className="pay-card">
          <span className="pay-icon"><Icon name="spark" /></span>
          <h1>{t("shop.pay.title")}</h1>
          <p>{t("shop.pay.intro")}</p>
          <label className="pay-consent" htmlFor="donation-consent">
            <input id="donation-consent" type="checkbox" checked={consent} disabled={waitLeft > 0} onChange={(e) => setConsent(e.target.checked)} />
            {t("shop.pay.consent.a")}<strong>{t("shop.pay.consent.b")}</strong>{t("shop.pay.consent.c")}<strong>{t("shop.pay.consent.d")}</strong>{t("shop.pay.consent.e")}
            {waitLeft > 0 ? ` ${t("shop.pay.wait", { seconds: waitLeft })}` : ""}
          </label>
          <button type="button" className="btn-primary btn-lg pay-cta" disabled={state === "sending" || !consent} onClick={() => void handlePay()}>
            {state === "sending" ? t("shop.pay.sending") : t("shop.pay.cta")}
          </button>
          {state === "error" ? <p className="detail-msg detail-msg--err" role="alert">{msg}</p> : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
