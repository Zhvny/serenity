import { useState } from "react";
import { useT } from "../i18n/t.ts";

// <img> yang jatuh ke placeholder bila URL kosong atau gagal dimuat (file belum ada di server).
// `label` = tampilkan teks "No image for now" (untuk gambar besar); gambar kecil cukup panggung berpola.
export function SafeImage({ src, alt, className, emptyClassName, label = false }: { src: string | null; alt: string; className: string; emptyClassName?: string; label?: boolean }) {
  const t = useT();
  const [ok, setOk] = useState(true);
  if (src === null || src === "" || !ok) {
    const stage = `${emptyClassName ?? className} product-photo--empty`;
    return label ? (
      <div className={stage} role="img" aria-label={t("menu.photo.none")}>
        <span className="no-image">{t("menu.photo.none")}</span>
      </div>
    ) : (
      <div className={stage} aria-hidden="true" />
    );
  }
  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setOk(false)} />;
}
