import { Link } from "react-router";
import { rupiah } from "../utils/format.ts";
import { ProductPhoto } from "./ProductPhoto.tsx";
import { Icon } from "./Icon.tsx";
import { useT } from "../i18n/t.ts";

type Common = { id: string; title: string };
type Props =
  | (Common & { variant: "post"; tag: string; excerpt: string; image_url?: string | null })
  | (Common & { variant: "product"; price: number; image_url?: string | null; category_id: string });

export function LandingCard(props: Props) {
  const t = useT();
  if (props.variant === "post") {
    return (
      <Link className="fact-card fact-card--link" to={`/posts/${encodeURIComponent(props.id)}`} aria-label={props.title}>
        {props.image_url !== null && props.image_url !== undefined && props.image_url !== "" ? (
          <img className="fact-photo" src={props.image_url} alt="" loading="lazy" />
        ) : (
          <div className="fact-photo fact-photo--empty" aria-hidden="true"><Icon name="leaf" /><span>{t("menu.photo.none")}</span></div>
        )}
        <span className="fact-tag">{props.tag}</span>
        <h3>{props.title}</h3>
        <p>{props.excerpt}</p>
      </Link>
    );
  }
  return (
    <Link className="fact-card fact-card--link" to={`/products/${encodeURIComponent(props.id)}`} aria-label={props.title}>
      <ProductPhoto product={{ name: props.title, image_url: props.image_url ?? null, category_id: props.category_id }} className="fact-photo" lazy />
      <h3>{props.title}</h3>
      <p className="price">{rupiah(props.price)}</p>
    </Link>
  );
}
