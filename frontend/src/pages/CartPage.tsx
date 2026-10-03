import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError, checkoutCart, getCart, getProducts, removeCartItem, updateCartItem } from "../services/api.ts";
import type { CartItem, Product } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { ProductPhoto } from "../components/ProductPhoto.tsx";
import { LocationPicker, type LatLng } from "../components/LocationPicker.tsx";
import { rupiah } from "../utils/format.ts";
import { burstAt } from "../fx/fx.ts";
import { Sprite } from "../pixel/Sprite.tsx";
import { PAPER_BAG_OPEN } from "../pixel/data/bakeryB.ts";
import { playSound } from "../fx/sound.ts";
import { tNow, useT } from "../i18n/t.ts";
import type { DictKey } from "../i18n/t.ts";
import { useLang } from "../i18n/useLang.ts";
import { localeOf } from "../i18n/store.ts";
import type { Lang } from "../i18n/store.ts";

const SLOTS = ["12:00", "15:00", "18:00", "21:00"];

// Label slot: Indonesia memakai "12:00" apa adanya; Inggris memakai format 12 jam ("12:00 PM").
function slotLabel(slot: string, lang: Lang): string {
  if (lang !== "en") return slot;
  const [h, m] = slot.split(":").map(Number);
  return new Date(2000, 0, 1, h ?? 0, m ?? 0).toLocaleTimeString(localeOf(lang), { hour: "numeric", minute: "2-digit" });
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CartRow({ item, product, onQty, onRemove }: { item: CartItem; product: Product | undefined; onQty: (q: number) => void; onRemove: () => void }) {
  const t = useT();
  const [draft, setDraft] = useState(String(item.quantity));
  const [pop, setPop] = useState(0); // naik setiap qty berubah -> animasi "pop" pada harga
  function changeQty(q: number): void {
    setPop((p) => p + 1);
    playSound("click");
    onQty(q);
  }
  // Sinkronkan input bila qty berubah dari luar (mis. gagal update -> balik ke nilai lama).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkron state eksternal (prop qty) ke draft lokal
  useEffect(() => { setDraft(String(item.quantity)); }, [item.quantity]);

  function commit(raw: string): void {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) { setDraft(String(item.quantity)); return; }
    const clamped = Math.min(10, Math.max(1, n));
    if (clamped !== item.quantity) changeQty(clamped);
    setDraft(String(clamped));
  }

  if (product === undefined) {
    return (
      <li className="cart-row">
        <p>{t("shop.cart.row.unavailable")}</p>
        <button type="button" className="btn-secondary cart-remove" aria-label={t("shop.cart.row.removeItem", { id: item.item_id })} onClick={onRemove}>{t("shop.cart.remove")}</button>
      </li>
    );
  }
  return (
    <li className="cart-row">
      <ProductPhoto product={product} className="cart-thumb" />
      <h3>{product.name}</h3>
      <div className="qty-ctrl">
        <button type="button" aria-label={t("shop.cart.row.dec", { name: product.name })} disabled={item.quantity <= 1} onClick={() => changeQty(item.quantity - 1)}>−</button>
        <input
          type="number"
          className="qty-input"
          min={1}
          max={10}
          inputMode="numeric"
          aria-label={t("shop.cart.row.qty", { name: product.name })}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); } }}
        />
        <button type="button" aria-label={t("shop.cart.row.inc", { name: product.name })} disabled={item.quantity >= 10} onClick={() => changeQty(item.quantity + 1)}>+</button>
      </div>
      {item.note !== null && item.note.trim() !== "" ? <p className="cart-note">{item.note}</p> : null}
      <p key={pop} className={pop > 0 ? "cart-price fx-pop" : "cart-price"}>{rupiah(product.price * item.quantity)}</p>
      <button
        type="button"
        className="cart-remove"
        aria-label={t("shop.cart.row.remove", { name: product.name })}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          burstAt(r.left + r.width / 2, r.top + r.height / 2, "crumbs");
          playSound("pop");
          onRemove();
        }}
      >{t("shop.cart.remove")}</button>
    </li>
  );
}

export function CartPage() {
  const t = useT();
  const [lang] = useLang();
  const [items, setItems] = useState<CartItem[]>([]);
  const [prods, setProds] = useState<Product[]>([]);
  const [state, setState] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [mode, setMode] = useState<"instant" | "scheduled">("instant");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("12:00");
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [checkout, setCheckout] = useState<"idle" | "sending" | "fail">("idle");
  const [checkoutMsg, setCheckoutMsg] = useState("");
  const [formError, setFormError] = useState<DictKey | "">("");
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset skeleton + pesan basi saat retry
    setState("loading");
    setErrorMsg("");
    Promise.all([getCart(), getProducts({})])
      .then(([c, p]) => {
        if (!alive) return;
        setItems(c);
        setProds(p);
        setState("done");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setErrorMsg(e instanceof ApiError ? e.message : tNow("shop.common.error"));
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const byId = new Map(prods.map((p) => [p.id, p]));
  const total = items.reduce((s, i) => s + (byId.get(i.product_id)?.price ?? 0) * i.quantity, 0);
  const minDate = tomorrowISO();

  async function handleQty(item: CartItem, q: number): Promise<void> {
    setErrorMsg("");
    try {
      const updated = await updateCartItem(item.item_id, q);
      setItems((prev) => prev.map((i) => (i.item_id === item.item_id ? updated : i)));
      window.dispatchEvent(new Event("cart:changed"));
    } catch (e: unknown) {
      setErrorMsg(e instanceof ApiError ? e.message : tNow("shop.common.error"));
    }
  }

  async function handleRemove(item: CartItem): Promise<void> {
    setErrorMsg("");
    try {
      await removeCartItem(item.item_id);
      setItems((prev) => prev.filter((i) => i.item_id !== item.item_id));
      window.dispatchEvent(new Event("cart:changed"));
    } catch (e: unknown) {
      setErrorMsg(e instanceof ApiError ? e.message : tNow("shop.common.error"));
    }
  }

  async function handleCheckout(): Promise<void> {
    if (mode === "scheduled") {
      if (date === "" || date < minDate) {
        setFormError("shop.cart.err.date");
        return;
      }
    }
    if (delivery === "delivery" && address.trim().length < 10) {
      setFormError("shop.cart.err.address");
      return;
    }
    setFormError("");
    setCheckout("sending");
    try {
      const base = { delivery_method: delivery, delivery_address: delivery === "delivery" ? address : null, delivery_lat: delivery === "delivery" ? coords?.lat ?? null : null, delivery_lng: delivery === "delivery" ? coords?.lng ?? null : null } as const;
      const res = mode === "instant"
        ? await checkoutCart({ mode: "instant", ...base })
        : await checkoutCart({ mode: "scheduled", scheduled_at: new Date(`${date}T${slot}:00+07:00`).toISOString(), ...base });
      void res;
      // Validasi server lolos -> lanjut ke halaman pembayaran QRIS.
      navigate("/checkout");
    } catch (e: unknown) {
      setCheckoutMsg(e instanceof ApiError ? e.message : tNow("shop.common.error"));
      setCheckout("fail");
    }
  }

  return (
    <div>
      <Header />
      <main className="cart-page">
        <h1>{t("shop.cart.title")}</h1>
        {state === "loading" ? (
          <div className="skeleton" aria-label={t("shop.cart.loading")} />
        ) : state === "error" ? (
          <div className="state" role="alert">
            <h2>{t("shop.cart.error.title")}</h2>
            <p>{errorMsg}</p>
            <button type="button" className="btn-primary" onClick={() => setReloadKey((k) => k + 1)}>{t("shop.common.retry")}</button>
          </div>
        ) : items.length === 0 ? (
          <div className="state" role="status">
            <Sprite sprite={PAPER_BAG_OPEN} className="empty-bag" />
            <h2>{t("shop.cart.empty.title")}</h2>
            <p>{t("shop.cart.empty.body")}</p>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-main">
              {errorMsg !== "" ? <p role="alert">{errorMsg}</p> : null}
              <p className="receipt-title" aria-hidden="true">{t("shop.cart.receipt")}</p>
              <ul className="cart-list">
                {items.map((i) => (
                  <CartRow key={i.item_id} item={i} product={byId.get(i.product_id)} onQty={(q) => void handleQty(i, q)} onRemove={() => void handleRemove(i)} />
                ))}
              </ul>
            </div>
            <aside className="cart-aside">
              <div className="cart-panel">
                <h2 className="cart-panel-title">{t("shop.cart.summary.title")}</h2>
                <div className="cart-summary">
                  <p>{t("shop.cart.summary.subtotal")} <span>{rupiah(total)}</span></p>
                  <h2>{t("shop.cart.summary.total")} <span>{rupiah(total)}</span></h2>
                  <p>{t("shop.cart.summary.shipnote")}</p>
                </div>
              </div>
              <div className="cart-panel">
                <h2 className="cart-panel-title">{t("shop.cart.when.title")}</h2>
                <div className="chip-group" role="group" aria-label={t("shop.cart.mode.label")}>
                  <button type="button" className={mode === "instant" ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={mode === "instant"} onClick={() => setMode("instant")}>{t("shop.cart.mode.instant")}</button>
                  <button type="button" className={mode === "scheduled" ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={mode === "scheduled"} onClick={() => setMode("scheduled")}>{t("shop.cart.mode.scheduled")}</button>
                </div>
                {mode === "scheduled" ? (
                  <div>
                    <label htmlFor="sched-date">{t("shop.cart.date")}</label>
                    <input id="sched-date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
                    <div className="chip-group" role="group" aria-label={t("shop.cart.slot.label")}>
                      {SLOTS.map((s) => (
                        <button key={s} type="button" className={slot === s ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={slot === s} onClick={() => setSlot(s)}>{slotLabel(s, lang)}</button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="chip-group" role="group" aria-label={t("shop.cart.method.label")}>
                  <button type="button" className={delivery === "pickup" ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={delivery === "pickup"} onClick={() => setDelivery("pickup")}>{t("shop.cart.method.pickup")}</button>
                  <button type="button" className={delivery === "delivery" ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={delivery === "delivery"} onClick={() => setDelivery("delivery")}>{t("shop.cart.method.delivery")}</button>
                </div>
                {delivery === "delivery" ? (
                  <div>
                    <label htmlFor="delivery-address">{t("shop.cart.address.label")}</label>
                    <LocationPicker value={coords} onChange={(v, addr) => { setCoords(v); if (addr !== null) setAddress(addr); }} />
                    <textarea id="delivery-address" maxLength={500} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("shop.cart.address.placeholder")} />
                    <p className="cart-opt-note"><Icon name="warning" /> {t("shop.cart.address.note")}</p>
                  </div>
                ) : null}
                {formError !== "" ? <p role="alert">{t(formError)}</p> : null}
                <button type="button" className="btn-primary btn-lg cart-checkout" disabled={checkout === "sending"} onClick={() => void handleCheckout()}>{t("shop.cart.checkout")} <Icon name="arrow-right" /></button>
                {checkout === "fail" ? (
                  <div role="alert">
                    <p>{checkoutMsg}</p>
                    <button type="button" className="btn-secondary" onClick={() => void handleCheckout()}>{t("shop.common.retry")}</button>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
