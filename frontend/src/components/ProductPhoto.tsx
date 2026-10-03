import { useState } from "react";
import { useT } from "../i18n/t.ts";
import type { Product } from "../services/api.ts";
import { Sprite } from "../pixel/Sprite.tsx";
import { spriteForProduct, stageFor } from "../pixel/productArt.ts";

// Placeholder bila produk belum punya foto: false = teks "No image for now"; true = ilustrasi pixel makanan.
export const PIXEL_ART_PLACEHOLDER = false;

// Foto produk; bila tak ada/gagal dimuat -> panggung placeholder (tetap kelas `product-photo--empty`).
export function ProductPhoto({ product, className, lazy = false }: { product: Pick<Product, "name" | "image_url" | "category_id">; className: string; lazy?: boolean }) {
  const t = useT();
  const [imgOk, setImgOk] = useState(true);
  if (product.image_url === null || !imgOk) {
    const stage = `${className} product-photo--empty product-photo--${stageFor(product)}`;
    return PIXEL_ART_PLACEHOLDER ? (
      <div className={stage} aria-hidden="true">
        <Sprite sprite={spriteForProduct(product)} />
      </div>
    ) : (
      <div className={stage} role="img" aria-label={t("menu.photo.none")}>
        <span className="no-image">{t("menu.photo.none")}</span>
      </div>
    );
  }
  return <img className={className} src={product.image_url} alt={product.name} loading={lazy ? "lazy" : undefined} onError={() => setImgOk(false)} />;
}
