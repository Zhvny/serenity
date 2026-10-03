import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { getPosts } from "../services/api.ts";
import type { Post } from "../services/api.ts";

const FALLBACK = [
  {
    title: "Kenapa beli Serenity?",
    body: "Kami memisahkan proses alergen/non-alergen secara higienis — tanpa catatan cross-contamination. Setiap porsi lengkap nutrisi: kalori, protein, karbo, lemak, serat, gula.",
    tag: "Fun Fact",
  },
  {
    title: "Dessert sehat bukan mitos",
    body: "Serenity menggunakan bahan alami, tanpa pengawet berbahaya. Dessert sehat + minuman sehat — semua bisa dinikmati tanpa rasa bersalah.",
    tag: "News",
  },
  {
    title: "Pre-order = lebih segar",
    body: "Karena dibuat berdasarkan pesanan (bukan stok), makanan lebih segar dan sesuai preferensi Anda — dari diet hingga atlet.",
    tag: "Soft Selling",
  },
];

export function FunFactPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [state, setState] = useState<"loading" | "done">("loading");

  useEffect(() => {
    let alive = true;
    getPosts()
      .then((p) => { if (alive) { setPosts(p); setState("done"); } })
      .catch(() => { if (alive) setState("done"); }); // gagal -> fallback konten brand
    return () => { alive = false; };
  }, []);

  type CardPost = { id: string | null; title: string; body: string; tag: string; created_at: string | null };
  const list: CardPost[] = posts.length > 0
    ? posts.map((p) => ({ id: p.id, title: p.title, body: p.body, tag: p.tag, created_at: p.created_at }))
    : FALLBACK.map((f) => ({ ...f, id: null, created_at: null }));
  const summary = (s: string) => (s.length > 120 ? `${s.slice(0, 120)}…` : s);
  const fmtDate = (iso: string | null) => {
    if (iso === null) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };
  if (state === "loading") {
    return (
      <div>
        <Header />
        <main className="content"><div className="skeleton" aria-label="Memuat fun fact" /></main>
        <Footer />
      </div>
    );
  }
  return (
    <div>
      <Header />
      <main className="content">
        <p><Link className="btn-link" to="/">← Beranda</Link></p>
        <div className="section-head">
          <span className="eyebrow">Serenity</span>
          <h1>Fun Fact & News</h1>
        </div>
        <p className="subtitle">Kenapa memilih Serenity? Ini cerita di balik dessert sehat kami.</p>
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
                <p>{summary(f.body)}</p>
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
