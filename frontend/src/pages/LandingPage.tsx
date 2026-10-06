import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";
import { getTrending, recordPostView, getPreference, savePreference, getRecommendations } from "../services/api.ts";
import type { Post, Recommendation, Need } from "../services/api.ts";
import { LandingCard } from "../components/LandingCard.tsx";
import { useT, type DictKey } from "../i18n/t.ts";
import { HeroScene } from "../pixel/HeroScene.tsx";
import { Bunting } from "../pixel/Bunting.tsx";
import { Sprite } from "../pixel/Sprite.tsx";
import { CHALKBOARD } from "../pixel/data/signs.ts";
import { useLang } from "../i18n/useLang.ts";
import { pickContent } from "../i18n/content.ts";

const NEEDS: Array<{ key: Need; dict: DictKey }> = [
  { key: "diet", dict: "landing.need.diet" },
  { key: "muscle", dict: "landing.need.muscle" },
  { key: "diabetes", dict: "landing.need.diabetes" },
  { key: "allergy_free", dict: "landing.need.allergy_free" },
  { key: "low_sugar", dict: "landing.need.low_sugar" },
];

const HERO_QUOTES: readonly DictKey[] = [
  "landing.hero.quote1",
  "landing.hero.quote2",
  "landing.hero.quote3",
  "landing.hero.quote4",
  "landing.hero.quote5",
];

export function LandingPage() {
  const t = useT();
  const [lang] = useLang();
  const [shown, setShown] = useState(false);
  const [quoteKey] = useState<DictKey>(() => HERO_QUOTES[Math.floor(Math.random() * HERO_QUOTES.length)] ?? "landing.hero.quote1");
  const [trending, setTrending] = useState<Post[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [, setNeeds] = useState<Need[] | null>(null);
  const [showNeed, setShowNeed] = useState(false);
  const [draft, setDraft] = useState<Need[]>([]);

  function toggleDraft(n: Need): void {
    setDraft((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 20);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let alive = true;
    getTrending()
      .then((p) => { if (alive) setTrending(p.slice(0, 3)); })
      .catch(() => { /* sembunyikan section bila gagal */ });
    getPreference()
      .then((p) => {
        if (!alive) return;
        if (p === null) setShowNeed(true);
        else setNeeds(p.needs);
      })
      .catch(() => { /* tanpa preferensi = tanpa popup, tanpa rekomendasi khusus */ });
    getRecommendations()
      .then((r) => { if (alive) setRecs(r.slice(0, 3)); })
      .catch(() => { /* sembunyikan section bila gagal */ });
    return () => { alive = false; };
  }, []);

  async function chooseNeed(ns: Need[]): Promise<void> {
    setNeeds(ns);
    setShowNeed(false);
    try {
      await savePreference(ns);
      setRecs((await getRecommendations()).slice(0, 3));
    } catch { /* preferensi lokal tetap, rekomendasi lama tetap */ }
  }

  return (
    <div>
      <Header />
      <main>
        <Bunting />
        <section className={`hero reveal${shown ? " is-in" : ""}`}>
          <div className="hero-copy">
            <span className="hero-eyebrow"><Icon name="leaf" /> {t("landing.hero.eyebrow")}</span>
            <h1>{t("landing.hero.title")}</h1>
            <p className="lead">{t("landing.hero.lead")}</p>
            <div className="hero-actions">
              <Link className="btn-primary" to="/menu">{t("landing.hero.cta")} <Icon name="arrow-right" /></Link>
              <Link className="btn-secondary" to="/funfact">{t("landing.hero.browse")}</Link>
            </div>
          </div>
          <div className="hero-visual">
            <HeroScene />
            <div className="hero-card hero-card--board hero-card--quote" aria-hidden="true">
              <Sprite sprite={CHALKBOARD} className="board-frame" />
              <div className="board-text"><h3 className="hero-quote">{t(quoteKey)}</h3></div>
            </div>
          </div>
        </section>
        {recs.length > 0 ? (
          <section className="section section--boxed" aria-label={t("landing.recs.title")}>
            <div className="section-head">
              <span className="eyebrow">{t("landing.recs.eyebrow")}</span>
              <h2>{t("landing.recs.title")}</h2>
            </div>
            <div className="facts-grid">
              {recs.map((r) => (
                <LandingCard key={r.id} variant="product" id={r.id} title={pickContent(lang, r.name_en, r.name)} price={r.price} image_url={r.image_url} category_id={r.category_id} />
              ))}
            </div>
          </section>
        ) : null}
        {trending.length > 0 ? (
          <section className="section section--boxed" aria-label={t("landing.reading.title")}>
            <div className="section-head">
              <span className="eyebrow">{t("landing.reading.eyebrow")}</span>
              <h2>{t("landing.reading.title")}</h2>
            </div>
            <div className="facts-grid">
              {trending.map((p) => (
                <div key={p.id} onClick={() => void recordPostView(p.id).catch(() => {})}>
                  <LandingCard variant="post" id={p.id} title={pickContent(lang, p.title_en, p.title)} tag={p.tag} image_url={p.image_url} excerpt={pickContent(lang, p.excerpt_en ?? p.excerpt, p.excerpt !== null && p.excerpt !== "" ? p.excerpt : p.body.length > 120 ? `${p.body.slice(0, 120)}…` : p.body)} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      {showNeed ? (
        <div role="dialog" aria-label={t("landing.need.title")} aria-modal="true" className="need-popup">
          <div className="need-popup-card">
          <h2>{t("landing.need.title")}</h2>
          <p>{t("landing.need.intro")}</p>
          <div role="group" aria-label={t("landing.need.title")}>
            {NEEDS.map((n) => (
              <label key={n.key}>
                <input type="checkbox" checked={draft.includes(n.key)} onChange={() => toggleDraft(n.key)} aria-label={t(n.dict)} />
                {t(n.dict)}
              </label>
            ))}
          </div>
          <div className="need-popup-actions">
            <button type="button" disabled={draft.length === 0} onClick={() => void chooseNeed(draft)}>{t("landing.need.simpan")}</button>
            <button type="button" onClick={() => setShowNeed(false)}>{t("landing.need.lewati")}</button>
          </div>
          </div>
        </div>
      ) : null}
      <Footer />
    </div>
  );
}
