import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { getPosts, getTrending, recordPostView, getPreference, savePreference, getRecommendations } from "../services/api.ts";
import type { Post, Product, Need } from "../services/api.ts";
import { LandingCard } from "../components/LandingCard.tsx";

const NEEDS: Array<{ key: Need; label: string }> = [
  { key: "diet", label: "Diet" },
  { key: "muscle", label: "Bentuk otot" },
  { key: "diabetes", label: "Diabetes" },
  { key: "allergy_free", label: "Bebas alergi" },
  { key: "low_sugar", label: "Rendah gula" },
];

const HERO_QUOTES = [
  "Sweeten your day, the wholesome way.",
  "Dessert can be kind to your body too.",
  "Good things, lightly sweetened.",
  "Treats that love you back.",
  "Sip sweet, stay light.",
];

export function LandingPage() {
  const [shown, setShown] = useState(false);
  const [quote] = useState(() => HERO_QUOTES[Math.floor(Math.random() * HERO_QUOTES.length)] ?? HERO_QUOTES[0]);
  const [latest, setLatest] = useState<Post[]>([]);
  const [trending, setTrending] = useState<Post[]>([]);
  const [recs, setRecs] = useState<Product[]>([]);
  const [need, setNeed] = useState<Need | null>(null);
  const [showNeed, setShowNeed] = useState(false);
  const [draft, setDraft] = useState<Need>("diet");

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 20);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let alive = true;
    getPosts()
      .then((p) => { if (alive) setLatest(p.slice(0, 3)); })
      .catch(() => { /* sembunyikan section bila gagal */ });
    getTrending()
      .then((p) => { if (alive) setTrending(p.slice(0, 3)); })
      .catch(() => { /* sembunyikan section bila gagal */ });
    getPreference()
      .then((p) => {
        if (!alive) return;
        if (p === null) setShowNeed(true);
        else setNeed(p.need);
      })
      .catch(() => { /* tanpa preferensi = tanpa popup, tanpa rekomendasi khusus */ });
    getRecommendations()
      .then((r) => { if (alive) setRecs(r.slice(0, 3)); })
      .catch(() => { /* sembunyikan section bila gagal */ });
    return () => { alive = false; };
  }, []);

  async function chooseNeed(n: Need): Promise<void> {
    setNeed(n);
    setShowNeed(false);
    try {
      await savePreference(n);
      setRecs((await getRecommendations()).slice(0, 3));
    } catch { /* preferensi lokal tetap, rekomendasi lama tetap */ }
  }

  return (
    <div>
      <Header />
      <main>
        <section className={`hero reveal${shown ? " is-in" : ""}`}>
          <div className="hero-copy">
            <span className="hero-eyebrow"><Icon name="leaf" /> Pre-order healty desserts &amp; drinks</span>
            <h1>Sweet that loves your body.</h1>
            <p className="lead">Low-sugar dessert &amp; healthy drinks, made fresh. Order now or schedule, pay with QRIS, pick up or delivery.</p>
            <div className="hero-actions">
              <Link className="btn-primary" to="/menu">Lihat Menu <Icon name="arrow-right" /></Link>
              <Link className="btn-secondary" to="/funfact">Fun Fact</Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card hero-card--quote" aria-hidden="true">
              <div className="product-photo product-photo--empty" />
              <div className="hero-card-body"><h3 className="hero-quote">{quote}</h3></div>
            </div>
          </div>
        </section>
        {trending.length > 0 ? (
          <section className="section section--boxed" aria-label="Trending">
            <div className="section-head">
              <span className="eyebrow">Trending</span>
              <h2>Lagi dibaca</h2>
            </div>
            <div className="facts-grid">
              {trending.map((p) => (
                <div key={p.id} onClick={() => void recordPostView(p.id).catch(() => {})}>
                  <LandingCard variant="post" id={p.id} title={p.title} tag={p.tag} excerpt={p.excerpt !== null && p.excerpt !== "" ? p.excerpt : p.body.length > 120 ? `${p.body.slice(0, 120)}…` : p.body} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {latest.length > 0 ? (
          <section className="section section--boxed" aria-label="Terbaru dari Serenity">
            <div className="section-head">
              <span className="eyebrow">Terbaru</span>
              <h2>Dari Serenity</h2>
            </div>
            <div className="facts-grid">
              {latest.map((p) => (
                <Link key={p.id} className="fact-card fact-card--link" to={`/posts/${encodeURIComponent(p.id)}`} aria-label={p.title}>
                  <span className="fact-tag">{p.tag}</span>
                  <h3>{p.title}</h3>
                  <p>{p.excerpt !== null && p.excerpt !== "" ? p.excerpt : p.body.length > 120 ? `${p.body.slice(0, 120)}…` : p.body}</p>
                </Link>
              ))}
            </div>
            <p className="section-more">
              <Link className="btn-secondary" to="/funfact">Lihat semua post</Link>
            </p>
          </section>
        ) : null}
        {recs.length > 0 ? (
          <section className="section section--boxed" aria-label="Rekomendasi untukmu">
            <div className="section-head">
              <span className="eyebrow">Rekomendasi</span>
              <h2>Untuk kebutuhanmu</h2>
            </div>
            <div className="admin-filters" role="group" aria-label="Pilih kebutuhan">
              {NEEDS.map((n) => (
                <button key={n.key} type="button" className={need === n.key ? "chip chip--active" : "chip"} aria-pressed={need === n.key} onClick={() => void chooseNeed(n.key)}>{n.label}</button>
              ))}
            </div>
            <div className="facts-grid">
              {recs.map((r) => (
                <LandingCard key={r.id} variant="product" id={r.id} title={r.name} price={r.price} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      {showNeed ? (
        <div role="dialog" aria-label="Pilih kebutuhan" aria-modal="true" className="need-popup">
          <h2>Apa kebutuhanmu?</h2>
          <p>Pilih satu agar rekomendasi di landing sesuai denganmu.</p>
          <div role="radiogroup" aria-label="Kebutuhan">
            {NEEDS.map((n) => (
              <label key={n.key}>
                <input type="radio" name="need" value={n.key} checked={draft === n.key} onChange={() => setDraft(n.key)} />
                {n.label}
              </label>
            ))}
          </div>
          <button type="button" onClick={() => void chooseNeed(draft)}>Simpan</button>
          <button type="button" onClick={() => setShowNeed(false)}>Lewati</button>
        </div>
      ) : null}
      <Footer />
    </div>
  );
}
