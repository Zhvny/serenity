import { useEffect, useState } from "react";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { ApiError, getPosts } from "../services/api.ts";
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

  const list = posts.length > 0 ? posts : FALLBACK;
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
        <h1>Fun Fact & News — Serenity</h1>
        <p className="subtitle">Kenapa memilih Serenity? Ini cerita di balik dessert sehat kami.</p>
        <div className="facts-grid">
          {list.map((f) => (
            <article key={f.title} className="fact-card" aria-label={f.title}>
              <span className="fact-tag">{f.tag}</span>
              <h2>{f.title}</h2>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
