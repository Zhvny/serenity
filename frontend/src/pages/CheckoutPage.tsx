import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError, generateCode, getCart, getProducts } from "../services/api.ts";
import type { CartItem, Product } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { tNow, useT } from "../i18n/t.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import { useLang } from "../i18n/useLang.ts";
import { pickContent } from "../i18n/content.ts";
import { rupiah } from "../utils/format.ts";

// Jeda paksa baca sebelum checkbox aktif (detik).
export const CONSENT_DELAY_S = 5;

const TURNSTILE_SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const SCRIPT_TIMEOUT_MS = 10000; // tunable
const SITEKEY = (import.meta.env.VITE_TURNSTILE_SITEKEY as string | undefined) ?? "0x4AAAAAAFQoHTp5aZtkc3hI";

type TurnstileApi = {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

function getTurnstile(): TurnstileApi | undefined {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile;
}

export function CheckoutPage() {
  const t = useT();
  usePageTitle(t("shop.pay.title"));
  const [lang] = useLang();
  const navigate = useNavigate();
  const [cart, setCart] = useState<{ items: CartItem[]; products: Product[] } | null>(null);
  const [widgetErr, setWidgetErr] = useState(false);
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
  const inFlight = useRef(false);

  // Ringkasan pesanan: gagal memuat tidak memblokir pembayaran (server tetap sumber kebenaran).
  useEffect(() => {
    let alive = true;
    Promise.all([getCart(), getProducts({})])
      .then(([items, products]) => { if (alive && Array.isArray(items) && Array.isArray(products)) setCart({ items, products }); })
      .catch(() => { /* tanpa ringkasan */ });
    return () => { alive = false; };
  }, []);

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
      "error-callback": () => setWidgetErr(true),
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
    if (token === "" || inFlight.current) return; // cegah klik beruntun membuat beberapa pesanan
    inFlight.current = true;
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
      inFlight.current = false;
    }
  }

  function retryWidget(): void {
    const ts = getTurnstile();
    setWidgetErr(false);
    setToken("");
    if (widgetId.current !== null && ts !== undefined) ts.reset(widgetId.current);
  }

  const lines = cart === null ? [] : cart.items.map((it) => {
    const p = cart.products.find((x) => x.id === it.product_id);
    return { id: it.item_id, qty: it.quantity, name: p === undefined ? it.product_id : pickContent(lang, p.name_en, p.name), sub: p === undefined ? 0 : p.price * it.quantity };
  });
  const total = lines.reduce((a, l) => a + l.sub, 0);
  const emptyCart = cart !== null && cart.items.length === 0;
  const blocked = script === "blocked";
  const canPay = consent && token !== "" && state !== "sending" && !blocked;

  return (
    <div>
      <Header />
      <main id="main" tabIndex={-1} className="pay-wrap">
        <div className="pay-card">
          <span className="pay-icon"><Icon name="spark" /></span>
          <h1>{t("shop.pay.title")}</h1>
          {emptyCart ? (
            <div className="state" role="status">
              <h2>{t("shop.cart.empty.title")}</h2>
              <p>{t("shop.pay.emptyHint")}</p>
              <Link className="btn-primary" to="/menu#menu">{t("shop.pay.toMenu")}</Link>
            </div>
          ) : (<>
          <p>{t("shop.pay.intro")}</p>
          {lines.length > 0 ? (
            <div className="pay-summary" aria-label={t("shop.pay.summary")}>
              <h2>{t("shop.pay.summary")}</h2>
              <ul>{lines.map((l) => <li key={l.id}><span>{l.qty}× {l.name}</span><span>{rupiah(l.sub)}</span></li>)}</ul>
              <p className="pay-total"><span>{t("shop.pay.total")}</span><strong>{rupiah(total)}</strong></p>
              <Link className="pay-edit" to="/cart">{t("shop.pay.edit")}</Link>
            </div>
          ) : null}
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
          {widgetErr ? (
            <p className="detail-msg detail-msg--err" role="alert">
              {t("shop.pay.widgetErr")} <button type="button" className="pay-retry" onClick={retryWidget}>{t("shop.pay.widgetRetry")}</button>
            </p>
          ) : null}
          {blocked ? <p className="detail-msg detail-msg--err" role="alert">{t("shop.pay.blocked")}</p> : null}
          <input ref={honeypot} name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" defaultValue="" style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px" }} />
          <button type="button" className="btn-primary btn-lg pay-cta" disabled={!canPay} onClick={() => void handlePay()}>
            {state === "sending" ? t("shop.pay.sending") : t("shop.pay.cta")}
          </button>
          {!canPay && state !== "sending" && !blocked && waitLeft === 0 ? <p className="pay-hint">{t(!consent ? "shop.pay.needConsent" : "shop.pay.needHuman")}</p> : null}
          {state === "error" ? <p className="detail-msg detail-msg--err" role="alert">{msg}</p> : null}
          </>)}
        </div>
      </main>
      <Footer />
    </div>
  );
}
