import { Link } from "react-router";
import { rupiah } from "../utils/format.ts";
import { ProductPhoto } from "./ProductPhoto.tsx";
import { SafeImage } from "./SafeImage.tsx";

type Common = { id: string; title: string };
type Props =
  | (Common & { variant: "post"; tag: string; excerpt: string; image_url?: string | null })
  | (Common & { variant: "product"; price: number; image_url?: string | null; category_id: string });

export function LandingCard(props: Props) {
  if (props.variant === "post") {
    return (
      <Link className="fact-card fact-card--link" to={`/posts/${encodeURIComponent(props.id)}`} aria-label={props.title}>
        <SafeImage src={props.image_url ?? null} alt="" className="fact-photo" emptyClassName="fact-photo fact-photo--empty" label />
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
