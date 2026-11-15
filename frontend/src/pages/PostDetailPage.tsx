import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getPost, ApiError } from "../services/api.ts";
import type { PostDetail } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { rupiah } from "../utils/format.ts";
import { SafeImage } from "../components/SafeImage.tsx";
import { useT } from "../i18n/t.ts";
import { usePageTitle } from "../hooks/usePageTitle.ts";
import { useLang } from "../i18n/useLang.ts";
import { localeOf } from "../i18n/store.ts";
import { pickContent } from "../i18n/content.ts";

export function PostDetailPage() {
  const t = useT();
  const [lang] = useLang();
  const { id } = useParams();
  const ref = id ?? "";
  const [state, setState] = useState<"loading" | "notfound" | "error" | "done">("loading");
  const [post, setPost] = useState<PostDetail | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  usePageTitle(post === null ? null : pickContent(lang, post.title_en, post.title));

  useEffect(() => {
    if (ref === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ref kosong dari router
      setState("notfound");
      return;
    }
    let alive = true;
    getPost(ref)
      .then((p) => { if (alive) { setPost(p); setState("done"); } })
      .catch((e: unknown) => {
        if (!alive) return;
        setState(e instanceof ApiError && e.code === "POST_NOT_FOUND" ? "notfound" : "error");
      });
    return () => { alive = false; };
  }, [ref, reloadKey]);

  if (state === "loading") {
    return (
      <div>
        <Header />
        <main id="main" tabIndex={-1} className="content"><div className="skeleton" aria-label={t("post.loading")} /></main>
        <Footer />
      </div>
    );
  }
  if (state === "error") {
    return (
      <div>
        <Header />
        <main id="main" tabIndex={-1} className="content">
          <div className="state" role="alert">
            <h1>{t("post.error.title")}</h1>
            <p>{t("post.error.text")}</p>
            <button type="button" className="btn-primary" onClick={() => { setState("loading"); setReloadKey((k) => k + 1); }}>{t("shop.common.retry")}</button>
            <Link className="btn-secondary" to="/funfact">{t("post.notfound.back")}</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  if (state === "notfound" || post === null) {
    return (
      <div>
        <Header />
        <main id="main" tabIndex={-1} className="content">
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
      <main id="main" tabIndex={-1} className="content">
        <p><Link className="btn-link" to="/funfact">{t("post.back")}</Link></p>
        <div className="detail-grid">
          <div>
            <SafeImage src={post.image_url} alt={post.title} className="product-photo post-photo" label />
          </div>
          <div>
            <p className="post-meta">
              <span className="fact-tag">{post.tag}</span>
              <time className="history-date">{fmtDate(post.created_at)}</time>
            </p>
            <h1 className="post-title">{pickContent(lang, post.title_en, post.title)}</h1>
            <p className="post-body">{pickContent(lang, post.body_en, post.body)}</p>
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
                <Link key={p.id} className="mini-card" to={`/products/${encodeURIComponent(p.id)}`} aria-label={pickContent(lang, p.name_en, p.name)}>
                  <SafeImage src={p.image_url} alt="" className="mini-photo" emptyClassName="mini-photo mini-photo--empty" />
                  <div className="mini-card-body">
                    <h3>{pickContent(lang, p.name_en, p.name)}</h3>
                    <p className="price">{rupiah(p.price)}</p>
                  </div>
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
