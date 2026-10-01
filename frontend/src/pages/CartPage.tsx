import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ApiError, checkoutCart, getCart, getProducts, removeCartItem, updateCartItem } from "../services/api.ts";
import type { CartItem, Product } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { LocationPicker, type LatLng } from "../components/LocationPicker.tsx";
import { rupiah } from "../utils/format.ts";

const SLOTS = ["12:00", "15:00", "18:00", "21:00"];

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CartRow({ item, product, onQty, onRemove }: { item: CartItem; product: Product | undefined; onQty: (q: number) => void; onRemove: () => void }) {
  const [imgOk, setImgOk] = useState(true);
  const [draft, setDraft] = useState(String(item.quantity));
  // Sinkronkan input bila qty berubah dari luar (mis. gagal update -> balik ke nilai lama).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkron state eksternal (prop qty) ke draft lokal
  useEffect(() => { setDraft(String(item.quantity)); }, [item.quantity]);

  function commit(raw: string): void {
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) { setDraft(String(item.quantity)); return; }
    const clamped = Math.min(10, Math.max(1, n));
    if (clamped !== item.quantity) onQty(clamped);
    setDraft(String(clamped));
  }

  if (product === undefined) {
    return (
      <li className="cart-row">
        <p>Produk tidak tersedia</p>
        <button type="button" className="btn-secondary cart-remove" aria-label={`Hapus item ${item.item_id}`} onClick={onRemove}>Hapus</button>
      </li>
    );
  }
  return (
    <li className="cart-row">
      {product.image_url === null || !imgOk ? (
        <div className="cart-thumb product-photo--empty" aria-hidden="true" />
      ) : (
        <img className="cart-thumb" src={product.image_url} alt={product.name} onError={() => setImgOk(false)} />
      )}
      <h3>{product.name}</h3>
      <div className="qty-ctrl">
        <button type="button" aria-label={`Kurangi ${product.name}`} disabled={item.quantity <= 1} onClick={() => onQty(item.quantity - 1)}>−</button>
        <input
          type="number"
          className="qty-input"
          min={1}
          max={10}
          inputMode="numeric"
          aria-label={`Jumlah ${product.name}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { commit((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).blur(); } }}
        />
        <button type="button" aria-label={`Tambah ${product.name}`} disabled={item.quantity >= 10} onClick={() => onQty(item.quantity + 1)}>+</button>
      </div>
      {item.note !== null && item.note.trim() !== "" ? <p className="cart-note">{item.note}</p> : null}
      <p className="cart-price">{rupiah(product.price * item.quantity)}</p>
      <button type="button" className="cart-remove" aria-label={`Hapus ${product.name}`} onClick={onRemove}>Hapus</button>
    </li>
  );
}

export function CartPage() {
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
  const [formError, setFormError] = useState("");
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
        setErrorMsg(e instanceof ApiError ? e.message : "Terjadi kesalahan");
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
      setErrorMsg(e instanceof ApiError ? e.message : "Terjadi kesalahan");
    }
  }

  async function handleRemove(item: CartItem): Promise<void> {
    setErrorMsg("");
    try {
      await removeCartItem(item.item_id);
      setItems((prev) => prev.filter((i) => i.item_id !== item.item_id));
      window.dispatchEvent(new Event("cart:changed"));
    } catch (e: unknown) {
      setErrorMsg(e instanceof ApiError ? e.message : "Terjadi kesalahan");
    }
  }

  async function handleCheckout(): Promise<void> {
    if (mode === "scheduled") {
      if (date === "" || date < minDate) {
        setFormError("Pilih tanggal mulai besok atau sesudahnya");
        return;
      }
    }
    if (delivery === "delivery" && address.trim().length < 10) {
      setFormError("Tandai lokasi di peta atau pakai lokasi saat ini (alamat minimal 10 karakter)");
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
      setCheckoutMsg(e instanceof ApiError ? e.message : "Terjadi kesalahan");
      setCheckout("fail");
    }
  }

  return (
    <div>
      <Header />
      <main className="cart-page">
        <h1>Keranjang</h1>
        {state === "loading" ? (
          <div className="skeleton" aria-label="Memuat keranjang" />
        ) : state === "error" ? (
          <div className="state" role="alert">
            <h2>Keranjang gagal dimuat</h2>
            <p>{errorMsg}</p>
            <button type="button" className="btn-primary" onClick={() => setReloadKey((k) => k + 1)}>Coba lagi</button>
          </div>
        ) : items.length === 0 ? (
          <div className="state" role="status">
            <h2>Keranjang kosong</h2>
            <p>Belum ada item di keranjang.</p>
          </div>
        ) : (
          <div className="cart-grid">
            <div className="cart-main">
              {errorMsg !== "" ? <p role="alert">{errorMsg}</p> : null}
              <ul className="cart-list">
                {items.map((i) => (
                  <CartRow key={i.item_id} item={i} product={byId.get(i.product_id)} onQty={(q) => void handleQty(i, q)} onRemove={() => void handleRemove(i)} />
                ))}
              </ul>
            </div>
            <aside className="cart-aside">
              <div className="cart-panel">
                <h2 className="cart-panel-title">Ringkasan</h2>
                <div className="cart-summary">
                  <p>Subtotal <span>{rupiah(total)}</span></p>
                  <h2>Total <span>{rupiah(total)}</span></h2>
                  <p>Estimasi ongkir dihitung saat checkout</p>
                </div>
              </div>
              <div className="cart-panel">
                <h2 className="cart-panel-title">Waktu &amp; pengambilan</h2>
                <div className="chip-group" role="group" aria-label="Mode order">
                  <button type="button" className={mode === "instant" ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={mode === "instant"} onClick={() => setMode("instant")}>Instant</button>
                  <button type="button" className={mode === "scheduled" ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={mode === "scheduled"} onClick={() => setMode("scheduled")}>Scheduled</button>
                </div>
                {mode === "scheduled" ? (
                  <div>
                    <label htmlFor="sched-date">Tanggal</label>
                    <input id="sched-date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
                    <div className="chip-group" role="group" aria-label="Slot waktu">
                      {SLOTS.map((s) => (
                        <button key={s} type="button" className={slot === s ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={slot === s} onClick={() => setSlot(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="chip-group" role="group" aria-label="Metode pengambilan">
                  <button type="button" className={delivery === "pickup" ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={delivery === "pickup"} onClick={() => setDelivery("pickup")}>Ambil sendiri</button>
                  <button type="button" className={delivery === "delivery" ? "chip-toggle chip-toggle--active" : "chip-toggle"} aria-pressed={delivery === "delivery"} onClick={() => setDelivery("delivery")}>Diantar</button>
                </div>
                {delivery === "delivery" ? (
                  <div>
                    <label htmlFor="delivery-address">Alamat pengiriman</label>
                    <LocationPicker value={coords} onChange={(v, addr) => { setCoords(v); if (addr !== null) setAddress(addr); }} />
                    <textarea id="delivery-address" maxLength={500} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Alamat terisi otomatis dari peta; sunting bila perlu (patokan, nomor rumah)" />
                    <p className="cart-opt-note"><Icon name="warning" /> Biaya pengiriman mengikuti harga Gosend atau layanan pengiriman lainnya — dapat berbeda saat checkout.</p>
                  </div>
                ) : null}
                {formError !== "" ? <p role="alert">{formError}</p> : null}
                <button type="button" className="btn-primary btn-lg cart-checkout" disabled={checkout === "sending"} onClick={() => void handleCheckout()}>Lanjut ke Pembayaran <Icon name="arrow-right" /></button>
                {checkout === "fail" ? (
                  <div role="alert">
                    <p>{checkoutMsg}</p>
                    <button type="button" className="btn-secondary" onClick={() => void handleCheckout()}>Coba lagi</button>
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
