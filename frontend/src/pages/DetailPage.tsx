import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError, addToCart, getProduct } from "../services/api.ts";
import type { Product } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { rupiah } from "../utils/format.ts";

export function DetailPage() {
  const { id } = useParams();
  const productId = id ?? "";
  const [prod, setProd] = useState<Product | null>(null);
  const [state, setState] = useState<"loading" | "notfound" | "error" | "done">(() => (productId === "" ? "notfound" : "loading"));
  const [errorMsg, setErrorMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [cart, setCart] = useState<"idle" | "adding" | "added" | "carterror">("idle");
  const [cartMsg, setCartMsg] = useState("");
  const [imgOk, setImgOk] = useState(true);

  useEffect(() => {
    if (productId === "") return;
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset status fetch saat id/retry berubah
    setState("loading");
    getProduct(productId)
      .then((p) => {
        if (!alive) return;
        setProd(p);
        setState("done");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        if (e instanceof ApiError && e.code === "PRODUCT_NOT_FOUND") {
          setState("notfound");
        } else {
          setErrorMsg(e instanceof ApiError ? e.message : "Terjadi kesalahan");
          setState("error");
        }
      });
    return () => {
      alive = false;
    };
  }, [productId, reloadKey]);

  async function handleAdd(): Promise<void> {
    setCart("adding");
    try {
      await addToCart({ product_id: productId, quantity: 1 });
      setCart("added");
      window.dispatchEvent(new Event("cart:changed"));
    } catch (e: unknown) {
      setCartMsg(e instanceof ApiError ? e.message : "Terjadi kesalahan");
      setCart("carterror");
    }
  }

  return (
    <div>
      <Header />
      <main>
        {state === "loading" ? (
          <div className="skeleton" aria-label="Memuat produk" />
        ) : state === "notfound" ? (
          <div className="state" role="alert">
            <h2>Produk tidak ditemukan</h2>
            <p>Menu yang dicari tidak ada atau sudah nonaktif.</p>
            <Link className="btn-secondary" to="/">Kembali ke Menu</Link>
          </div>
        ) : state === "error" ? (
          <div className="state" role="alert">
            <h2>Produk gagal dimuat</h2>
            <p>{errorMsg}</p>
            <button type="button" className="btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
              Coba lagi
            </button>
          </div>
        ) : prod !== null ? (
          <div className="detail-grid">
            {prod.image_url === null || !imgOk ? (
              <div className="product-photo product-photo--empty" aria-hidden="true" />
            ) : (
              <img className="product-photo" src={prod.image_url} alt={prod.name} onError={() => setImgOk(false)} />
            )}
            <h1>{prod.name}</h1>
            <h2>{rupiah(prod.price)}</h2>
            <div className="tags">
              {prod.tags.map((t) => (
                <span key={t} className="tag">{t}</span>
              ))}
            </div>
            <table aria-label="Informasi nutrisi">
              <tbody>
                <tr><th scope="row">Kalori</th><td>{prod.nutrition.calories_kcal} kkal</td></tr>
                <tr><th scope="row">Protein</th><td>{prod.nutrition.protein_g} g</td></tr>
                <tr><th scope="row">Karbohidrat</th><td>{prod.nutrition.carbs_g} g</td></tr>
                <tr><th scope="row">Lemak</th><td>{prod.nutrition.fat_g} g</td></tr>
                <tr><th scope="row">Serat</th><td>{prod.nutrition.fiber_g} g</td></tr>
                <tr><th scope="row">Gula</th><td>{prod.nutrition.sugar_g} g</td></tr>
              </tbody>
            </table>
            {prod.allergens.length > 0 ? (
              <ul aria-label="Alergen">
                {prod.allergens.map((a) => (
                  <li key={a}>
                    <span className="warn-icon" aria-hidden="true">⚠</span> {a}
                  </li>
                ))}
              </ul>
            ) : null}
            <button type="button" className="btn-primary" disabled={cart === "adding"} onClick={() => void handleAdd()}>
              <span aria-hidden="true">+ </span>Tambahkan ke Keranjang
            </button>
            {cart === "added" ? <p role="status">Ditambahkan</p> : null}
            {cart === "carterror" ? <p role="alert">{cartMsg}</p> : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
