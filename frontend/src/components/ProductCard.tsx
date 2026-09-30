import { useState } from "react";
import { Link } from "react-router";
import type { Product } from "../services/api.ts";
import { rupiah } from "../utils/format.ts";

export function ProductCard({ product }: { product: Product }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <Link className="product-card" to={`/products/${product.id}`} aria-label={product.name}>
      {product.image_url === null || !imgOk ? (
        <div className="product-photo product-photo--empty" aria-hidden="true" />
      ) : (
        <img className="product-photo" src={product.image_url} alt={product.name} loading="lazy" onError={() => setImgOk(false)} />
      )}
      <h3>{product.name}</h3>
      <p className="price">{rupiah(product.price)}</p>
      <div className="tags">
        {product.tags.map((t) => (
          <span key={t} className="tag">{t}</span>
        ))}
      </div>
    </Link>
  );
}
