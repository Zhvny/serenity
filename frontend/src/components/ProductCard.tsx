import { Link } from "react-router";
import type { Product } from "../services/api.ts";
import { rupiah } from "../utils/format.ts";
import { ProductPhoto } from "./ProductPhoto.tsx";
import { Sprite } from "../pixel/Sprite.tsx";
import { PRICE_TAG } from "../pixel/data/signs.ts";
import { useLang } from "../i18n/useLang.ts";
import { pickContent } from "../i18n/content.ts";

export function ProductCard({ product }: { product: Product }) {
  const [lang] = useLang();
  const name = pickContent(lang, product.name_en, product.name);
  return (
    <Link className="product-card" to={`/products/${product.id}`} aria-label={name}>
      <ProductPhoto product={product} className="product-photo" lazy />
      <span className="price-tag" aria-hidden="true">
        <Sprite sprite={PRICE_TAG} />
        <span className="price-tag-text">{rupiah(product.price).replace(/^Rp\s?/, "")}</span>
      </span>
      <h3>{name}</h3>
      <p className="price">{rupiah(product.price)}</p>
      <div className="tags">
        {product.tags.map((t) => (
          <span key={t} className="tag">{t}</span>
        ))}
      </div>
    </Link>
  );
}
