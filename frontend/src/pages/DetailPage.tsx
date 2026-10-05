import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError, addToCart, getProduct } from "../services/api.ts";
import type { Product } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { ProductPhoto } from "../components/ProductPhoto.tsx";
import { rupiah } from "../utils/format.ts";
import { useLang } from "../i18n/useLang.ts";
import { allergenLabel } from "../i18n/content.ts";
import { tNow, useT } from "../i18n/t.ts";
import { burstAt, flyToCart } from "../fx/fx.ts";
import { playSound } from "../fx/sound.ts";
import { BREAD_LOAF, CUPCAKE, COOKIE, CROISSANT } from "../pixel/data/bakeryA.ts";

// Roti yang terbang ke keranjang menurut kategori produk.
function treatFor(categoryId: string) {
  return categoryId === "cat_dessert" ? CUPCAKE : categoryId === "cat_food" ? BREAD_LOAF : categoryId === "cat_drink" ? COOKIE : CROISSANT;
}

export function DetailPage() {
  const t = useT();
  const [lang] = useLang();
  const { id } = useParams();
  const productId = id ?? "";
  const [prod, setProd] = useState<Product | null>(null);
  const [state, setState] = useState<"loading" | "notfound" | "error" | "done">(() => (productId === "" ? "notfound" : "loading"));
  const [errorMsg, setErrorMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [cart, setCart] = useState<"idle" | "adding" | "added" | "carterror">("idle");
  const [cartMsg, setCartMsg] = useState("");

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
          setErrorMsg(e instanceof ApiError ? e.message : tNow("shop.common.error"));
          setState("error");
        }
      });
    return () => {
      alive = false;
    };
  }, [productId, reloadKey]);

  async function handleAdd(btn: HTMLElement): Promise<void> {
    setCart("adding");
    try {
      await addToCart({ product_id: productId, quantity: 1 });
      setCart("added");
      window.dispatchEvent(new Event("cart:changed"));
      const r = btn.getBoundingClientRect();
      burstAt(r.right - 14, r.top + 4, "sparkle");
      flyToCart(btn, treatFor(prod?.category_id ?? ""));
      playSound("ding");
    } catch (e: unknown) {
      setCartMsg(e instanceof ApiError ? e.message : tNow("shop.common.error"));
      setCart("carterror");
    }
  }

  return (
    <div>
      <Header />
      <main>
        {state === "loading" ? (
          <div className="skeleton" aria-label={t("shop.detail.loading")} />
        ) : state === "notfound" ? (
          <div className="state" role="alert">
            <h2>{t("shop.detail.notfound.title")}</h2>
            <p>{t("shop.detail.notfound.body")}</p>
            <Link className="btn-secondary" to="/menu">{t("shop.detail.notfound.back")}</Link>
          </div>
        ) : state === "error" ? (
          <div className="state" role="alert">
            <h2>{t("shop.detail.error.title")}</h2>
            <p>{errorMsg}</p>
            <button type="button" className="btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
              {t("shop.common.retry")}
            </button>
          </div>
        ) : prod !== null ? (
          <article className="detail-grid">
            <div className="detail-media">
              <ProductPhoto product={prod} className="product-photo" />
            </div>
            <div className="detail-body">
              <div className="tags">
                {prod.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
              <h1>{prod.name}</h1>
              <p className="detail-price">{rupiah(prod.price)}</p>
              {prod.description !== null ? <p className="detail-desc">{prod.description}</p> : null}

              <h2 className="detail-subhead">{t("shop.detail.nutrition")}</h2>
              <dl className="stat-grid" aria-label={t("shop.detail.nutrition")}>
                <div className="stat"><dd className="stat-num">{prod.nutrition.calories_kcal}<span className="unit">{t("shop.detail.unit.kcal")}</span></dd><dt className="stat-label">{t("shop.detail.calories")}</dt></div>
                <div className="stat"><dd className="stat-num">{prod.nutrition.protein_g}<span className="unit">g</span></dd><dt className="stat-label">{t("shop.detail.protein")}</dt></div>
                <div className="stat"><dd className="stat-num">{prod.nutrition.carbs_g}<span className="unit">g</span></dd><dt className="stat-label">{t("shop.detail.carbs")}</dt></div>
                <div className="stat"><dd className="stat-num">{prod.nutrition.fat_g}<span className="unit">g</span></dd><dt className="stat-label">{t("shop.detail.fat")}</dt></div>
                <div className="stat"><dd className="stat-num">{prod.nutrition.fiber_g}<span className="unit">g</span></dd><dt className="stat-label">{t("shop.detail.fiber")}</dt></div>
                <div className="stat"><dd className="stat-num">{prod.nutrition.sugar_g}<span className="unit">g</span></dd><dt className="stat-label">{t("shop.detail.sugar")}</dt></div>
              </dl>

              {prod.allergens.length > 0 ? (
                <>
                  <h2 className="detail-subhead">{t("shop.detail.allergens")}</h2>
                  <ul className="allergen-list" aria-label={t("shop.detail.allergens")}>
                    {prod.allergens.map((a) => (
                      <li key={a}><Icon name="warning" /> {allergenLabel(a, lang)}</li>
                    ))}
                  </ul>
                </>
              ) : null}

              <button type="button" className="btn-primary btn-lg detail-cta" disabled={cart === "adding"} onClick={(e) => void handleAdd(e.currentTarget)}>
                <Icon name="cart" /> {t("shop.detail.add")}
              </button>
              {cart === "added" ? <p className="detail-msg" role="status"><Icon name="check" /> {t("shop.detail.added")}</p> : null}
              {cart === "carterror" ? <p className="detail-msg detail-msg--err" role="alert">{cartMsg}</p> : null}
            </div>
          </article>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
