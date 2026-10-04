import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { getPosts } from "../services/api.ts";
import type { Post } from "../services/api.ts";
import { useT, type DictKey } from "../i18n/t.ts";
import { useLang } from "../i18n/useLang.ts";
import { localeOf } from "../i18n/store.ts";

const FALLBACK: Array<{ title: DictKey; body: DictKey; tag: DictKey }> = [
  { title: "funfact.fallback.title1", body: "funfact.fallback.body1", tag: "funfact.fallback.tag1" },
  { title: "funfact.fallback.title2", body: "funfact.fallback.body2", tag: "funfact.fallback.tag2" },
  { title: "funfact.fallback.title3", body: "funfact.fallback.body3", tag: "funfact.fallback.tag3" },
];

export function FunFactPage() {
  const t = useT();
  const [lang] = useLang();
  const [posts, setPosts] = useState<Post[]>([]);
  const [state, setState] = useState<"loading" | "done">("loading");

  useEffect(() => {
    let alive = true;
    getPosts()
      .then((p) => { if (alive) { setPosts(p); setState("done"); } })
      .catch(() => { if (alive) setState("done"); }); // gagal -> fallback konten brand
    return () => { alive = false; };
  }, []);

  const excerptOf = (p: { body: string; excerpt: string | null }) =>
    p.excerpt !== null && p.excerpt !== "" ? p.excerpt : p.body.length > 120 ? `${p.body.slice(0, 120)}…` : p.body;
  type CardPost = { id: string | null; title: string; body: string; excerpt: string | null; tag: string; created_at: string | null };
  const list: CardPost[] = posts.length > 0
    ? posts.map((p) => ({ id: p.id, title: p.title, body: p.body, excerpt: p.excerpt, tag: p.tag, created_at: p.created_at }))
    : FALLBACK.map((f) => ({ ...f, title: t(f.title), body: t(f.body), tag: t(f.tag), id: null, excerpt: null, created_at: null }));
  const fmtDate = (iso: string | null) => {
    if (iso === null) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(localeOf(lang), { day: "numeric", month: "short", year: "numeric" });
  };
  if (state === "loading") {
    return (
      <div>
        <Header />
        <main className="content"><div className="skeleton" aria-label={t("funfact.loading")} /></main>
        <Footer />
      </div>
    );
  }
  return (
    <div>
      <Header />
      <main className="content">
        <p><Link className="btn-link" to="/">{t("funfact.home")}</Link></p>
        <div className="section-head">
          <span className="eyebrow">{t("funfact.eyebrow")}</span>
          <h1>{t("funfact.title")}</h1>
        </div>
        <p className="subtitle">{t("funfact.subtitle")}</p>
        <div className="facts-grid">
          {list.map((f) => {
            const date = fmtDate(f.created_at);
            const card = (
              <>
                <div className="fact-top">
                  <span className="fact-tag">{f.tag}</span>
                  {date !== "" ? <time className="history-date">{date}</time> : null}
                </div>
                <h2>{f.title}</h2>
                <p>{excerptOf(f)}</p>
              </>
            );
            return f.id === null ? (
              <article key={f.title} className="fact-card" aria-label={f.title}>{card}</article>
            ) : (
              <Link key={f.id} className="fact-card fact-card--link" to={`/posts/${encodeURIComponent(f.id)}`} aria-label={f.title}>{card}</Link>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
