import { useEffect, useState } from "react";
import { ApiError, checkoutCart, getCart, getProducts, removeCartItem, updateCartItem } from "../services/api.ts";
import type { CartItem, Product } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { rupiah } from "../utils/format.ts";

const SLOTS = ["12:00", "15:00", "18:00", "21:00"];

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function CartRow({ item, product, onQty, onRemove }: { item: CartItem; product: Product | undefined; onQty: (q: number) => void; onRemove: () => void }) {
  const [imgOk, setImgOk] = useState(true);
  if (product === undefined) {
    return (
      <li>
        <p>Produk tidak tersedia</p>
        <button type="button" className="btn-secondary" aria-label={`Hapus item ${item.item_id}`} onClick={onRemove}>X</button>
      </li>
    );
  }
  return (
    <li>
      {product.image_url === null || !imgOk ? (
        <div className="product-photo product-photo--empty" style={{ width: 60, height: 60 }} aria-hidden="true" />
      ) : (
        <img src={product.image_url} alt={product.name} width={60} height={60} onError={() => setImgOk(false)} />
      )}
      <h3>{product.name}</h3>
      <div>
        <button type="button" aria-label={`Kurangi ${product.name}`} disabled={item.quantity <= 1} onClick={() => onQty(item.quantity - 1)}>-</button>
        <span aria-label={`Jumlah ${product.name}`}>{item.quantity}</span>
        <button type="button" aria-label={`Tambah ${product.name}`} disabled={item.quantity >= 10} onClick={() => onQty(item.quantity + 1)}>+</button>
      </div>
      {item.note !== null && item.note.trim() !== "" ? <p style={{ color: "#8C8478", fontStyle: "italic" }}>{item.note}</p> : null}
      <p>{rupiah(product.price * item.quantity)}</p>
      <button type="button" aria-label={`Hapus ${product.name}`} onClick={onRemove}>X</button>
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
  const [checkout, setCheckout] = useState<"idle" | "sending" | "success" | "fail">("idle");
  const [checkoutMsg, setCheckoutMsg] = useState("");
  const [checkoutMode, setCheckoutMode] = useState("");
  const [formError, setFormError] = useState("");

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
      setFormError("Alamat pengiriman minimal 10 karakter");
      return;
    }
    setFormError("");
    setCheckout("sending");
    try {
      const base = { delivery_method: delivery, delivery_address: delivery === "delivery" ? address : null } as const;
      const res = mode === "instant"
        ? await checkoutCart({ mode: "instant", ...base })
        : await checkoutCart({ mode: "scheduled", scheduled_at: new Date(`${date}T${slot}:00+07:00`).toISOString(), ...base });
      setCheckoutMode(res.mode);
      setCheckout("success");
    } catch (e: unknown) {
      setCheckoutMsg(e instanceof ApiError ? e.message : "Terjadi kesalahan");
      setCheckout("fail");
    }
  }

  return (
    <div>
      <Header />
      <main>
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
          <>
            {errorMsg !== "" ? <p role="alert">{errorMsg}</p> : null}
            <ul>
              {items.map((i) => (
                <CartRow key={i.item_id} item={i} product={byId.get(i.product_id)} onQty={(q) => void handleQty(i, q)} onRemove={() => void handleRemove(i)} />
              ))}
            </ul>
            <div>
              <p>Subtotal <span>{rupiah(total)}</span></p>
              <h2>Total <span>{rupiah(total)}</span></h2>
              <p>Estimasi dihitung saat checkout</p>
            </div>
            <div role="group" aria-label="Mode order">
              <button type="button" className="btn-secondary" aria-pressed={mode === "instant"} style={mode === "instant" ? { background: "#7A8F6E", color: "#FFFFFF" } : undefined} onClick={() => setMode("instant")}>Instant</button>
              <button type="button" className="btn-secondary" aria-pressed={mode === "scheduled"} style={mode === "scheduled" ? { background: "#7A8F6E", color: "#FFFFFF" } : undefined} onClick={() => setMode("scheduled")}>Scheduled</button>
            </div>
            {mode === "scheduled" ? (
              <div>
                <label htmlFor="sched-date">Tanggal</label>
                <input id="sched-date" type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
                <div role="group" aria-label="Slot waktu">
                  {SLOTS.map((s) => (
                    <button key={s} type="button" className="btn-secondary" aria-pressed={slot === s} style={slot === s ? { background: "#7A8F6E", color: "#FFFFFF" } : undefined} onClick={() => setSlot(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ) : null}
            {formError !== "" ? <p role="alert">{formError}</p> : null}
            <div role="group" aria-label="Metode pengambilan">
              <button type="button" className="btn-secondary" aria-pressed={delivery === "pickup"} style={delivery === "pickup" ? { background: "#7A8F6E", color: "#FFFFFF" } : undefined} onClick={() => setDelivery("pickup")}>Ambil sendiri</button>
              <button type="button" className="btn-secondary" aria-pressed={delivery === "delivery"} style={delivery === "delivery" ? { background: "#7A8F6E", color: "#FFFFFF" } : undefined} onClick={() => setDelivery("delivery")}>Diantar</button>
            </div>
            {delivery === "delivery" ? (
              <div>
                <label htmlFor="delivery-address">Alamat pengiriman</label>
                <textarea id="delivery-address" maxLength={500} value={address} onChange={(e) => setAddress(e.target.value)} />
                <p><span style={{ color: "#D4A843" }}>⚠</span> Biaya pengiriman mengikuti harga Gosend atau layanan pengiriman lainnya — dapat berbeda saat checkout.</p>
              </div>
            ) : null}
            <button type="button" className="btn-primary" disabled={checkout === "sending"} onClick={() => void handleCheckout()}>Lanjut ke Pembayaran</button>
            {checkout === "success" ? <p role="status">{`Pesanan disiapkan — lanjutkan pembayaran (${checkoutMode})`}</p> : null}
            {checkout === "fail" ? (
              <div role="alert">
                <p>{checkoutMsg}</p>
                <button type="button" className="btn-secondary" onClick={() => void handleCheckout()}>Coba lagi</button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
