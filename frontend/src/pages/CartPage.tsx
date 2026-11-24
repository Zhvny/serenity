import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { addToCart, checkoutCart, getCart, getProducts, removeCartItem, updateCartItem } from "../services/api.ts";
import type { CartItem, Product } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { ProductPhoto } from "../components/ProductPhoto.tsx";
import { LocationPicker, type LatLng } from "../components/LocationPicker.tsx";
import { rupiah } from "../utils/format.ts";
import { apiMessage } from "../utils/apiMessage.ts";
import { shouldFillAddress } from "../utils/address.ts";
import { normalizeName, normalizePhone } from "../utils/contact.ts";
import { burstAt } from "../fx/fx.ts";
import { Sprite } from "../pixel/Sprite.tsx";
import { PAPER_BAG_OPEN } from "../pixel/data/bakeryB.ts";
import { playSound } from "../fx/sound.ts";
import { useT } from "../i18n/t.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import type { DictKey } from "../i18n/t.ts";
import { useLang } from "../i18n/useLang.ts";
import { pickContent } from "../i18n/content.ts";
import { localeOf } from "../i18n/store.ts";
import type { Lang } from "../i18n/store.ts";

const SLOTS = ["12:00", "15:00", "18:00", "21:00"];

// Label slot: Indonesia memakai "12:00" apa adanya; Inggris memakai format 12 jam ("12:00 PM").
function slotLabel(slot: string, lang: Lang): string {
  if (lang !== "en") return slot;
  const [h, m] = slot.split(":").map(Number);
  return new Date(2000, 0, 1, h ?? 0, m ?? 0).toLocaleTimeString(localeOf(lang), { hour: "numeric", minute: "2-digit" });
}

const FORM_KEY = "serenity-cart-form";
type SavedForm = { mode?: "instant" | "scheduled"; date?: string; slot?: string; delivery?: "pickup" | "delivery"; address?: string; coords?: LatLng | null; name?: string; phone?: string };

// Pilihan waktu & pengambilan diingat selama sesi tab, agar tombol Kembali dari pembayaran tak menghapusnya.
function loadForm(): SavedForm {
  try {
    const raw = window.sessionStorage.getItem(FORM_KEY);
    return raw === null ? {} : (JSON.parse(raw) as SavedForm);
  } catch {
    return {};
  }
}

const MAX_SCHEDULE_DAYS = 60; // jadwal paling jauh yang masuk akal untuk pre-order

function dayISO(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CartRow({ item, product, onQty, onRemove }: { item: CartItem; product: Product | undefined; onQty: (q: number) => void; onRemove: () => void }) {
  const t = useT();
  const [lang] = useLang();
  const [draft, setDraft] = useState(String(item.quantity));
  const [pop, setPop] = useState(0); // naik setiap qty berubah -> animasi "pop" pada harga
  function changeQty(q: number): void {
    setPop((p) => p + 1);
    playSound("click");
    onQty(q);
  }
  const sentQty = useRef(item.quantity);

  // Sinkronkan input bila qty berubah dari luar (mis. gagal update -> balik ke nilai lama).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkron state eksternal (prop qty) ke draft lokal
  useEffect(() => { setDraft(String(item.quantity)); sentQty.current = item.quantity; }, [item.quantity]);

  // Ketikan angka berlaku otomatis setelah jeda singkat (tanpa harus keluar dari kolom).
  useEffect(() => {
    const n = Number.parseInt(draft, 10);
    if (!Number.isFinite(n) || n === item.quantity) return;
    const timer = setTimeout(() => commit(draft), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya jadwal ulang saat ketikan berubah
  }, [draft]);

  function commit(raw: string): void {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) { setDraft(String(item.quantity)); return; }
    const clamped = Math.min(10, Math.max(1, n));
    if (clamped !== item.quantity && clamped !== sentQty.current) { sentQty.current = clamped; changeQty(clamped); }
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
      <h3>{pickContent(lang, product.name_en, product.name)}</h3>
      <div className="qty-ctrl">
        <button type="button" aria-label={t("shop.cart.row.dec", { name: pickContent(lang, product.name_en, product.name) })} disabled={item.quantity <= 1} onClick={() => changeQty(item.quantity - 1)}>−</button>
        <input
          type="number"
          className="qty-input"
          min={1}
          max={10}
          inputMode="numeric"
          aria-label={t("shop.cart.row.qty", { name: pickContent(lang, product.name_en, product.name) })}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); } }}
        />
        <button type="button" aria-label={t("shop.cart.row.inc", { name: pickContent(lang, product.name_en, product.name) })} disabled={item.quantity >= 10} onClick={() => changeQty(item.quantity + 1)}>+</button>
      </div>
      {item.note !== null && item.note.trim() !== "" ? <p className="cart-note">{item.note}</p> : null}
      <p key={pop} className={pop > 0 ? "cart-price fx-pop" : "cart-price"}>{rupiah(product.price * item.quantity)}</p>
      <button
        type="button"
        className="cart-remove"
        aria-label={t("shop.cart.row.remove", { name: pickContent(lang, product.name_en, product.name) })}
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
  usePageTitle(t("shop.cart.title"));
  const [lang] = useLang();
  const [items, setItems] = useState<CartItem[]>([]);
  const [prods, setProds] = useState<Product[]>([]);
  const [state, setState] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [saved] = useState<SavedForm>(loadForm);
  const [mode, setMode] = useState<"instant" | "scheduled">(saved.mode === "scheduled" ? "scheduled" : "instant");
  const [date, setDate] = useState(typeof saved.date === "string" && saved.date >= dayISO(1) && saved.date <= dayISO(MAX_SCHEDULE_DAYS) ? saved.date : "");
  const [slot, setSlot] = useState(typeof saved.slot === "string" && SLOTS.includes(saved.slot) ? saved.slot : "12:00");
  const [delivery, setDelivery] = useState<"pickup" | "delivery">(saved.delivery === "delivery" ? "delivery" : "pickup");
  const [address, setAddress] = useState(typeof saved.address === "string" ? saved.address.slice(0, 500) : "");
  const [custName, setCustName] = useState(typeof saved.name === "string" ? saved.name.slice(0, 80) : "");
  const [custPhone, setCustPhone] = useState(typeof saved.phone === "string" ? saved.phone.slice(0, 30) : "");
  const [coords, setCoords] = useState<LatLng | null>(saved.coords !== undefined && saved.coords !== null && Number.isFinite(saved.coords.lat) && Number.isFinite(saved.coords.lng) ? saved.coords : null);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(FORM_KEY, JSON.stringify({ mode, date, slot, delivery, address, coords, name: custName, phone: custPhone } satisfies SavedForm));
    } catch { /* penyimpanan tak tersedia: abaikan */ }
  }, [mode, date, slot, delivery, address, coords, custName, custPhone]);
  const [checkout, setCheckout] = useState<"idle" | "sending" | "fail">("idle");
  const [checkoutMsg, setCheckoutMsg] = useState("");
  const [formError, setFormError] = useState<DictKey | "">("");
  const [addressEdited, setAddressEdited] = useState(typeof saved.address === "string" && saved.address.trim() !== "");
  const [removed, setRemoved] = useState<{ item: CartItem; name: string } | null>(null);

  useEffect(() => {
    if (removed === null) return;
    const timer = setTimeout(() => setRemoved(null), 8000);
    return () => clearTimeout(timer);
  }, [removed]);
  const isDateErr = formError === "shop.cart.err.date" || formError === "shop.cart.err.datePast" || formError === "shop.cart.err.dateFar";
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
        setErrorMsg(apiMessage(e));
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const byId = new Map(prods.map((p) => [p.id, p]));
  const total = items.reduce((s, i) => s + (byId.get(i.product_id)?.price ?? 0) * i.quantity, 0);
  const minDate = dayISO(1);
  const maxDate = dayISO(MAX_SCHEDULE_DAYS);

  async function handleQty(item: CartItem, q: number): Promise<void> {
    setErrorMsg("");
    try {
      const updated = await updateCartItem(item.item_id, q);
      setItems((prev) => prev.map((i) => (i.item_id === item.item_id ? updated : i)));
      window.dispatchEvent(new Event("cart:changed"));
    } catch (e: unknown) {
      setErrorMsg(apiMessage(e));
    }
  }

  // Urungkan hapus: tambahkan lagi produk, jumlah, dan catatan yang sama (baris baru di akhir daftar).
  async function handleUndo(): Promise<void> {
    if (removed === null) return;
    const { item } = removed;
    setRemoved(null);
    try {
      const back = await addToCart({ product_id: item.product_id, quantity: item.quantity, ...(item.note !== null ? { note: item.note } : {}) });
      setItems((prev) => [...prev, back]);
      window.dispatchEvent(new Event("cart:changed"));
    } catch (e: unknown) {
      setErrorMsg(apiMessage(e));
    }
  }

  async function handleRemove(item: CartItem): Promise<void> {
    setErrorMsg("");
    try {
      await removeCartItem(item.item_id);
      setItems((prev) => prev.filter((i) => i.item_id !== item.item_id));
      const prod = byId.get(item.product_id);
      setRemoved({ item, name: prod === undefined ? item.product_id : pickContent(lang, prod.name_en, prod.name) });
      window.dispatchEvent(new Event("cart:changed"));
    } catch (e: unknown) {
      setErrorMsg(apiMessage(e));
    }
  }

  // Bawa pengguna ke kolom yang salah (kesalahan tampil tepat di bawahnya).
  function focusField(id: string): void {
    const el = document.getElementById(id);
    if (el === null) return;
    if (typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "center" });
    el.focus({ preventScroll: true });
  }

  async function handleCheckout(): Promise<void> {
    const okName = normalizeName(custName);
    if (okName === null) {
      setFormError("shop.cart.err.name");
      focusField("contact-name");
      return;
    }
    const okPhone = normalizePhone(custPhone);
    if (okPhone === null) {
      setFormError("shop.cart.err.phone");
      focusField("contact-phone");
      return;
    }
    if (mode === "scheduled") {
      if (date === "" || date < minDate || date > maxDate) {
        setFormError(date === "" ? "shop.cart.err.date" : date < minDate ? "shop.cart.err.datePast" : "shop.cart.err.dateFar");
        focusField("sched-date");
        return;
      }
    }
    if (delivery === "delivery" && address.trim().length < 10) {
      setFormError("shop.cart.err.address");
      focusField("delivery-address");
      return;
    }
    setFormError("");
    setCheckout("sending");
    try {
      const base = { customer_name: okName, customer_phone: okPhone, delivery_method: delivery, delivery_address: delivery === "delivery" ? address : null, delivery_lat: delivery === "delivery" ? coords?.lat ?? null : null, delivery_lng: delivery === "delivery" ? coords?.lng ?? null : null } as const;
      const res = mode === "instant"
        ? await checkoutCart({ mode: "instant", ...base })
        : await checkoutCart({ mode: "scheduled", scheduled_at: new Date(`${date}T${slot}:00+07:00`).toISOString(), ...base });
      void res;
      // Validasi server lolos -> lanjut ke halaman pembayaran (transfer bank).
      navigate("/checkout");
    } catch (e: unknown) {
      setCheckoutMsg(apiMessage(e));
      setCheckout("fail");
    }
  }

  return (
    <div>
      <Header />
      <main id="main" tabIndex={-1} className="cart-page">
        <h1>{t("shop.cart.title")}</h1>
        {removed !== null ? (
          <p className="undo-bar" role="status">
            {t("shop.cart.removed", { name: removed.name })}{" "}
            <button type="button" className="undo-btn" onClick={() => void handleUndo()}>{t("shop.cart.undo")}</button>
          </p>
        ) : null}
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
              <p className="cart-more"><Link className="btn-link" to="/menu#menu">{t("shop.cart.more")}</Link></p>
            </div>
            <aside className="cart-aside">
              <div className="cart-panel">
                <h2 className="cart-panel-title">{t("shop.cart.summary.title")}</h2>
                <div className="cart-summary">
                  <p>{t("shop.cart.summary.subtotal")} <span>{rupiah(total)}</span></p>
                  <h2>{t("shop.cart.summary.total")} <span>{rupiah(total)}</span></h2>
                  <p>{delivery === "delivery" ? t("shop.cart.summary.shipnoteDelivery") : t("shop.cart.summary.shipnotePickup")}</p>
                </div>
              </div>
              <div className="cart-panel">
                <h2 className="cart-panel-title">{t("shop.cart.contact.title")}</h2>
                <p className="cart-opt-note">{t("shop.cart.contact.hint")}</p>
                <label className="cart-field-label" htmlFor="contact-name">{t("shop.cart.contact.name")}</label>
                <input id="contact-name" className="cart-input" type="text" autoComplete="name" maxLength={80} value={custName} aria-invalid={formError === "shop.cart.err.name"} aria-describedby={formError === "shop.cart.err.name" ? "form-err" : undefined} onChange={(e) => { setCustName(e.target.value); setFormError(""); }} />
                {formError === "shop.cart.err.name" ? <p id="form-err" className="field-error" role="alert"><Icon name="warning" /> {t(formError)}</p> : null}
                <label className="cart-field-label" htmlFor="contact-phone">{t("shop.cart.contact.phone")}</label>
                <input id="contact-phone" className="cart-input" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="0812 3456 7890" value={custPhone} aria-invalid={formError === "shop.cart.err.phone"} aria-describedby={formError === "shop.cart.err.phone" ? "form-err" : undefined} onChange={(e) => { setCustPhone(e.target.value); setFormError(""); }} />
                {formError === "shop.cart.err.phone" ? <p id="form-err" className="field-error" role="alert"><Icon name="warning" /> {t(formError)}</p> : null}
              </div>
              <div className="cart-panel">
                <h2 className="cart-panel-title">{t("shop.cart.when.title")}</h2>
                <p className="cart-field-label" id="cart-ask-when">{t("shop.cart.ask.when")}</p>
                <div className="chip-group" role="group" aria-label={t("shop.cart.mode.label")}>
                  <button type="button" className={mode === "instant" ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={mode === "instant"} onClick={() => setMode("instant")}>{t("shop.cart.mode.instant")}</button>
                  <button type="button" className={mode === "scheduled" ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={mode === "scheduled"} onClick={() => setMode("scheduled")}>{t("shop.cart.mode.scheduled")}</button>
                </div>
                {mode === "scheduled" ? (
                  <div>
                    <label htmlFor="sched-date">{t("shop.cart.date")}</label>
                    <input id="sched-date" type="date" min={minDate} max={maxDate} value={date} aria-invalid={isDateErr} aria-describedby={isDateErr ? "form-err" : undefined} onChange={(e) => { setDate(e.target.value); setFormError(""); }} />
                    {isDateErr ? <p id="form-err" className="field-error" role="alert"><Icon name="warning" /> {t(formError)}</p> : null}
                    <div className="chip-group" role="group" aria-label={t("shop.cart.slot.label")}>
                      {SLOTS.map((s) => (
                        <button key={s} type="button" className={slot === s ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={slot === s} onClick={() => setSlot(s)}>{slotLabel(s, lang)}</button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="cart-field-label" id="cart-ask-how">{t("shop.cart.ask.how")}</p>
                <div className="chip-group" role="group" aria-label={t("shop.cart.method.label")}>
                  <button type="button" className={delivery === "pickup" ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={delivery === "pickup"} onClick={() => setDelivery("pickup")}>{t("shop.cart.method.pickup")}</button>
                  <button type="button" className={delivery === "delivery" ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={delivery === "delivery"} onClick={() => setDelivery("delivery")}>{t("shop.cart.method.delivery")}</button>
                </div>
                {delivery === "delivery" ? (
                  <div>
                    <label htmlFor="delivery-address">{t("shop.cart.address.label")}</label>
                    <p className="cart-opt-note">{t("shop.cart.address.hint")}</p>
                    <LocationPicker value={coords} onChange={(v, addr) => { setCoords(v); if (addr !== null && shouldFillAddress(address, addressEdited)) setAddress(addr); }} />
                    <textarea id="delivery-address" maxLength={500} value={address} aria-invalid={formError === "shop.cart.err.address"} aria-describedby={formError === "shop.cart.err.address" ? "form-err" : undefined} onChange={(e) => { setAddress(e.target.value); setAddressEdited(e.target.value.trim() !== ""); setFormError(""); }} placeholder={t("shop.cart.address.placeholder")} />
                    {formError === "shop.cart.err.address" ? <p id="form-err" className="field-error" role="alert"><Icon name="warning" /> {t(formError)}</p> : null}
                    <p className="cart-opt-note"><Icon name="warning" /> {t("shop.cart.address.note")}</p>
                  </div>
                ) : null}
                <button type="button" className="btn-primary btn-lg cart-checkout" disabled={checkout === "sending"} onClick={() => void handleCheckout()}>{t("shop.cart.checkout")} <Icon name="arrow-right" /></button>
                {checkout === "fail" ? (
                  <div role="alert">
                    <p className="field-error"><Icon name="warning" /> {checkoutMsg}</p>
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
