import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError, addToCart, getProduct } from "../services/api.ts";
import type { Product } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
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
          <article className="detail-grid">
            <div className="detail-media">
              {prod.image_url === null || !imgOk ? (
                <div className="product-photo product-photo--empty" aria-hidden="true" />
              ) : (
                <img className="product-photo" src={prod.image_url} alt={prod.name} onError={() => setImgOk(false)} />
              )}
            </div>
            <div className="detail-body">
              <div className="tags">
                {prod.tags.map((t) => (
                  <span key={t} className="tag">{t}</span>
                ))}
              </div>
              <h1>{prod.name}</h1>
              <p className="detail-price">{rupiah(prod.price)}</p>
              {prod.description !== null ? <p className="detail-desc">{prod.description}</p> : null}

              <h2 className="detail-subhead">Informasi nutrisi</h2>
              <dl className="stat-grid" aria-label="Informasi nutrisi">
                <div className="stat"><dd className="stat-num">{prod.nutrition.calories_kcal}<span className="unit">kkal</span></dd><dt className="stat-label">Kalori</dt></div>
                <div className="stat"><dd className="stat-num">{prod.nutrition.protein_g}<span className="unit">g</span></dd><dt className="stat-label">Protein</dt></div>
                <div className="stat"><dd className="stat-num">{prod.nutrition.carbs_g}<span className="unit">g</span></dd><dt className="stat-label">Karbohidrat</dt></div>
                <div className="stat"><dd className="stat-num">{prod.nutrition.fat_g}<span className="unit">g</span></dd><dt className="stat-label">Lemak</dt></div>
                <div className="stat"><dd className="stat-num">{prod.nutrition.fiber_g}<span className="unit">g</span></dd><dt className="stat-label">Serat</dt></div>
                <div className="stat"><dd className="stat-num">{prod.nutrition.sugar_g}<span className="unit">g</span></dd><dt className="stat-label">Gula</dt></div>
              </dl>

              {prod.allergens.length > 0 ? (
                <>
                  <h2 className="detail-subhead">Alergen</h2>
                  <ul className="allergen-list" aria-label="Alergen">
                    {prod.allergens.map((a) => (
                      <li key={a}><Icon name="warning" /> {a}</li>
                    ))}
                  </ul>
                </>
              ) : null}

              <button type="button" className="btn-primary btn-lg detail-cta" disabled={cart === "adding"} onClick={() => void handleAdd()}>
                <Icon name="cart" /> Tambahkan ke Keranjang
              </button>
              {cart === "added" ? <p className="detail-msg" role="status"><Icon name="check" /> Ditambahkan</p> : null}
              {cart === "carterror" ? <p className="detail-msg detail-msg--err" role="alert">{cartMsg}</p> : null}
            </div>
          </article>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
