import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError, generateCode } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { tNow, useT } from "../i18n/t.ts";

// Jeda paksa baca sebelum checkbox aktif (detik).
export const CONSENT_DELAY_S = 5;

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const SCRIPT_TIMEOUT_MS = 10000; // tunable
const SITEKEY = (import.meta.env.VITE_TURNSTILE_SITEKEY as string | undefined) ?? "0x4AAAAAAFQoHTp5aZtkc3hI";

type TurnstileApi = {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; "expired-callback": () => void }) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

function getTurnstile(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile;
}

export function CheckoutPage() {
  const t = useT();
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [consent, setConsent] = useState(false);
  const [waitLeft, setWaitLeft] = useState(CONSENT_DELAY_S);
  const [script, setScript] = useState<"loading" | "ready" | "blocked">(() =>
    getTurnstile() !== undefined ? "ready" : "loading");
  const [token, setToken] = useState("");
  const widgetHost = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const honeypot = useRef<HTMLInputElement | null>(null);

  // Interval tunggal (bukan timeout berantai): tiap detik kurang 1 hingga 0.
  // Interval tak bergantung effect re-run sehingga aman di fake-timer.
  useEffect(() => {
    const timer = setInterval(() => setWaitLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Muat script Turnstile sekali; deteksi blokir (ad-blocker/DNS) via timeout.
  useEffect(() => {
    if (script !== "loading") return;
    let done = false;
    const finish = (s: "ready" | "blocked") => {
      if (done) return;
      done = true;
      setScript(s); // hasil async load script / timeout, bukan render sinkron
    };
    const timer = setTimeout(() => finish("blocked"), SCRIPT_TIMEOUT_MS);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT}"]`);
    if (existing !== null) {
      if (getTurnstile() !== undefined) {
        clearTimeout(timer);
        finish("ready");
      } else {
        existing.addEventListener("load", () => { clearTimeout(timer); finish("ready"); }, { once: true });
        existing.addEventListener("error", () => { clearTimeout(timer); finish("blocked"); }, { once: true });
      }
      return () => clearTimeout(timer);
    }
    const el = document.createElement("script");
    el.src = TURNSTILE_SCRIPT;
    el.async = true;
    el.onload = () => { clearTimeout(timer); finish("ready"); };
    el.onerror = () => { clearTimeout(timer); finish("blocked"); };
    document.head.appendChild(el);
    return () => clearTimeout(timer);
  }, [script]);

  // Render widget HANYA setelah consent: token sekali-pakai berumur pendek,
  // render di awal berisiko basi saat tombol diklik.
  useEffect(() => {
    const ts = getTurnstile();
    if (!consent || script !== "ready" || ts === undefined || widgetHost.current === null || widgetId.current !== null) return;
    widgetId.current = ts.render(widgetHost.current, {
      sitekey: SITEKEY,
      callback: (tok) => setToken(tok),
      "expired-callback": () => {
        setToken("");
        if (widgetId.current !== null) ts.reset(widgetId.current);
      },
    });
  }, [consent, script]);

  // Buang widget saat unmount (tanpa setState -> aman lint).
  useEffect(() => () => {
    const ts = getTurnstile();
    if (widgetId.current !== null && ts !== undefined) ts.remove(widgetId.current);
  }, []);

  function handleConsent(checked: boolean): void {
    // Consent dicabut -> buang widget + token di event handler (bukan effect).
    if (!checked) {
      const ts = getTurnstile();
      if (widgetId.current !== null && ts !== undefined) ts.remove(widgetId.current);
      widgetId.current = null;
      setToken("");
    }
    setConsent(checked);
  }

  async function handlePay(): Promise<void> {
    if (token === "") return;
    setState("sending");
    setMsg("");
    try {
      const { unique_code } = await generateCode(consent, token, honeypot.current?.value ?? "");
      window.dispatchEvent(new Event("cart:changed"));
      navigate(`/thanks?ref=${encodeURIComponent(unique_code)}`);
    } catch (e: unknown) {
      if (e instanceof ApiError && (e.code === "TURNSTILE_FAILED" || e.code === "RATE_LIMITED")) {
        setMsg(t("shop.pay.retryHistory"));
      } else {
        setMsg(e instanceof ApiError ? e.message : tNow("shop.pay.error"));
      }
      setState("error");
    }
  }

  const blocked = script === "blocked";
  const canPay = consent && token !== "" && state !== "sending" && !blocked;

  return (
    <div>
      <Header />
      <main className="pay-wrap">
        <div className="pay-card">
          <span className="pay-icon"><Icon name="spark" /></span>
          <h1>{t("shop.pay.title")}</h1>
          <p>{t("shop.pay.intro")}</p>
          <label className="pay-consent" htmlFor="donation-consent">
            <input id="donation-consent" type="checkbox" checked={consent} disabled={waitLeft > 0} onChange={(e) => handleConsent(e.target.checked)} />
            {t("shop.pay.consent.a")}<strong>{t("shop.pay.consent.b")}</strong>{t("shop.pay.consent.c")}<strong>{t("shop.pay.consent.d")}</strong>{t("shop.pay.consent.e")}
            {waitLeft > 0 ? ` ${t("shop.pay.wait", { seconds: waitLeft })}` : ""}
          </label>
          {consent ? (
            <div aria-live="polite">
              <p className="pay-meta">{t("shop.pay.human")}</p>
              <div ref={widgetHost} />
            </div>
          ) : null}
          {blocked ? <p className="detail-msg detail-msg--err" role="alert">{t("shop.pay.blocked")}</p> : null}
          <input ref={honeypot} name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" defaultValue="" style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px" }} />
          <button type="button" className="btn-primary btn-lg pay-cta" disabled={!canPay} onClick={() => void handlePay()}>
            {state === "sending" ? t("shop.pay.sending") : t("shop.pay.cta")}
          </button>
          {state === "error" ? <p className="detail-msg detail-msg--err" role="alert">{msg}</p> : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
