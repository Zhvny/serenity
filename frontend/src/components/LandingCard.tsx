import { Link } from "react-router";
import { rupiah } from "../utils/format.ts";

type Common = { id: string; title: string };
type Props =
  | (Common & { variant: "post"; tag: string; excerpt: string })
  | (Common & { variant: "product"; price: number });

export function LandingCard(props: Props) {
  if (props.variant === "post") {
    return (
      <Link className="fact-card fact-card--link" to={`/posts/${encodeURIComponent(props.id)}`} aria-label={props.title}>
        <span className="fact-tag">{props.tag}</span>
        <h3>{props.title}</h3>
        <p>{props.excerpt}</p>
      </Link>
    );
  }
  return (
    <Link className="fact-card fact-card--link" to={`/products/${encodeURIComponent(props.id)}`} aria-label={props.title}>
      <h3>{props.title}</h3>
      <p className="price">{rupiah(props.price)}</p>
    </Link>
  );
}
