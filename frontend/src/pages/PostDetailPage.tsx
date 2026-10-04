import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getPost } from "../services/api.ts";
import type { PostDetail } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { rupiah } from "../utils/format.ts";
import { useT } from "../i18n/t.ts";
import { useLang } from "../i18n/useLang.ts";
import { localeOf } from "../i18n/store.ts";

export function PostDetailPage() {
  const t = useT();
  const [lang] = useLang();
  const { id } = useParams();
  const ref = id ?? "";
  const [state, setState] = useState<"loading" | "notfound" | "done">("loading");
  const [post, setPost] = useState<PostDetail | null>(null);

  useEffect(() => {
    if (ref === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ref kosong dari router
      setState("notfound");
      return;
    }
    let alive = true;
    getPost(ref)
      .then((p) => { if (alive) { setPost(p); setState("done"); } })
      .catch(() => { if (alive) setState("notfound"); });
    return () => { alive = false; };
  }, [ref]);

  if (state === "loading") {
    return (
      <div>
        <Header />
        <main className="content"><div className="skeleton" aria-label={t("post.loading")} /></main>
        <Footer />
      </div>
    );
  }
  if (state === "notfound" || post === null) {
    return (
      <div>
        <Header />
        <main className="content">
          <div className="state" role="alert">
            <h1>{t("post.notfound.title")}</h1>
            <Link className="btn-secondary" to="/funfact">{t("post.notfound.back")}</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(localeOf(lang), { day: "numeric", month: "short", year: "numeric" });
  };
  return (
    <div>
      <Header />
      <main className="content">
        <p><Link className="btn-link" to="/funfact">{t("post.back")}</Link></p>
        <div className="detail-grid">
          <div>
            {post.image_url !== null && post.image_url !== "" ? (
              <img className="product-photo post-photo" src={post.image_url} alt={post.title} loading="lazy" />
            ) : (
              <div className="product-photo product-photo--empty" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="post-meta">
              <span className="fact-tag">{post.tag}</span>
              <time className="history-date">{fmtDate(post.created_at)}</time>
            </p>
            <h1 className="post-title">{post.title}</h1>
            <p className="post-body">{post.body}</p>
          </div>
        </div>
        {post.products.length > 0 ? (
          <section aria-label={t("post.suggested.label")}>
            <div className="section-head">
              <span className="eyebrow">{t("post.suggested.eyebrow")}</span>
              <h2>{t("post.suggested.title")}</h2>
            </div>
            <div className="mini-grid">
              {post.products.map((p) => (
                <Link key={p.id} className="mini-card" to={`/products/${encodeURIComponent(p.id)}`} aria-label={p.name}>
                  {p.image_url !== null && p.image_url !== "" ? (
                    <img className="mini-photo" src={p.image_url} alt="" loading="lazy" />
                  ) : (
                    <div className="mini-photo mini-photo--empty" aria-hidden="true" />
                  )}
                  <h3>{p.name}</h3>
                  <p className="price">{rupiah(p.price)}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
