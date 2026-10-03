import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { getPosts } from "../services/api.ts";
import type { Post } from "../services/api.ts";

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

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 20);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let alive = true;
    getPosts()
      .then((p) => { if (alive) setLatest(p.slice(0, 3)); })
      .catch(() => { /* sembunyikan section bila gagal */ });
    return () => { alive = false; };
  }, []);

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
        {latest.length > 0 ? (
          <section className="section" aria-label="Terbaru dari Serenity">
            <div className="section-head">
              <span className="eyebrow">Terbaru</span>
              <h2>Dari Serenity</h2>
            </div>
            <div className="facts-grid">
              {latest.map((p) => (
                <article key={p.id} className="fact-card" aria-label={p.title}>
                  <span className="fact-tag">{p.tag}</span>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
