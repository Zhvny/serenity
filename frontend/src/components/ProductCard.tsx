import { Link } from "react-router";
import type { Product } from "../services/api.ts";
import { rupiah } from "../utils/format.ts";
import { ProductPhoto } from "./ProductPhoto.tsx";
import { Sprite } from "../pixel/Sprite.tsx";
import { PRICE_TAG } from "../pixel/data/signs.ts";
import { useLang } from "../i18n/useLang.ts";
import { useT } from "../i18n/t.ts";
import { pickContent, tagLabel, allergenLabel } from "../i18n/content.ts";
import { Icon } from "./Icon.tsx";

export function ProductCard({ product }: { product: Product }) {
  const [lang] = useLang();
  const t = useT();
  const name = pickContent(lang, product.name_en, product.name);
  return (
    <Link className="product-card" to={`/products/${encodeURIComponent(product.id)}`} aria-label={name}>
      <ProductPhoto product={product} className="product-photo" lazy />
      {typeof product.nutrition.calories_kcal === "number" ? (
        <span className="price-tag" aria-hidden="true">
          <Sprite sprite={PRICE_TAG} />
          <span className="price-tag-text">{product.nutrition.calories_kcal} {t("shop.detail.unit.kcal")}</span>
        </span>
      ) : null}
      <h3>{name}</h3>
      <p className="price">{rupiah(product.price)}</p>
      {product.allergens.length > 0 ? (
        <p className="card-allergens"><Icon name="warning" /> {t("menu.allergens", { list: product.allergens.map((a) => allergenLabel(a, lang)).join(", ") })}</p>
      ) : (
        <p className="card-allergens card-allergens--none">{t("menu.allergens.none")}</p>
      )}
      <div className="tags">
        {product.tags.map((tg) => (
          <span key={tg} className="tag">{tagLabel(tg, lang)}</span>
        ))}
      </div>
    </Link>
  );
}
