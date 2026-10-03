import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ApiError, getCategories, getProducts } from "../services/api.ts";
import type { Category, Product } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { FilterBar } from "../components/FilterBar.tsx";
import type { Filter } from "../components/FilterBar.tsx";
import { ProductCard } from "../components/ProductCard.tsx";
import { Icon } from "../components/Icon.tsx";
import { HeroScene } from "../pixel/HeroScene.tsx";
import { Bunting } from "../pixel/Bunting.tsx";
import { PastryRow } from "../pixel/PastryRow.tsx";
import { Sprite } from "../pixel/Sprite.tsx";
import { CAT_HEAD } from "../pixel/data/mascot.ts";
import { CHALKBOARD } from "../pixel/data/signs.ts";
import { OVEN, OVEN_GLOW } from "../pixel/data/bakeryB.ts";
import { rupiah } from "../utils/format.ts";
import { useT } from "../i18n/t.ts";
import type { DictKey } from "../i18n/t.ts";

// Kunci kutipan; dipilih sekali, diterjemahkan saat render.
const HERO_QUOTES: readonly DictKey[] = ["menu.hero.quote1", "menu.hero.quote2", "menu.hero.quote3", "menu.hero.quote4", "menu.hero.quote5"];

export function MenuPage() {
  const t = useT();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>(() => {
    const c = searchParams.get("category");
    return c === null ? { kind: "all" } : { kind: "category", id: c };
  });
  const [cats, setCats] = useState<Category[]>([]);
  const [prods, setProds] = useState<Product[]>([]);
  const [state, setState] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [shown, setShown] = useState(false);
  const [quoteKey] = useState<DictKey>(() => HERO_QUOTES[Math.floor(Math.random() * HERO_QUOTES.length)] ?? "menu.hero.quote1");

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), 20);
    return () => clearTimeout(timer);
  }, []);

  // ponytail: URL (?category=) sumber filter kategori; tag tetap state lokal
  useEffect(() => {
    const c = searchParams.get("category");
    if (c === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sinkron state eksternal (URL router) ke filter lokal
      setFilter((prev) => (prev.kind === "category" ? { kind: "all" } : prev));
    } else {
      setFilter((prev) => (prev.kind === "category" && prev.id === c ? prev : { kind: "category", id: c }));
    }
  }, [searchParams]);

  function handleChange(f: Filter): void {
    setFilter(f);
    if (f.kind === "category") {
      setSearchParams({ category: f.id });
    } else {
      setSearchParams({});
    }
  }

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset skeleton saat filter/retry berubah
    setState("loading");
    Promise.all([
      getCategories(),
      getProducts(
        filter.kind === "all"
          ? {}
          : filter.kind === "category"
            ? { category: filter.id }
            : { tag: filter.tag },
      ),
    ])
      .then(([c, p]) => {
        if (!alive) return;
        setCats(c);
        setProds(p);
        setState("done");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setErrorMsg(e instanceof ApiError ? e.message : null);
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [filter, reloadKey]);

  const featured = prods[0] ?? null;
  return (
    <div>
      <Header categories={cats} />
      <main>
        <Bunting />
        <section className={`hero reveal${shown ? " is-in" : ""}`}>
          <div className="hero-copy">
            <span className="hero-eyebrow"><Icon name="leaf" /> {t("menu.hero.eyebrow")}</span>
            <h1>{t("menu.hero.title")}</h1>
            <p className="lead">{t("menu.hero.lead")}</p>
            <div className="hero-actions">
              <a className="btn-primary" href="#menu">{t("menu.hero.cta")} <Icon name="arrow-right" /></a>
              <a className="btn-secondary" href="#menu">{t("menu.hero.browse")}</a>
            </div>
          </div>
          <div className="hero-visual">
            <HeroScene />
            {featured !== null ? (
              <Link to={`/products/${featured.id}`} className="hero-card hero-card--board" aria-label={t("menu.board.label", { name: featured.name })}>
                <Sprite sprite={CHALKBOARD} className="board-frame" />
                <div className="board-text">
                  <p className="board-kicker">{t("menu.board.kicker")}</p>
                  <h3>{featured.name}</h3>
                  <p className="price">{rupiah(featured.price)}</p>
                  <p className="board-stats">{t("menu.board.stats", { kcal: featured.nutrition.calories_kcal, protein: featured.nutrition.protein_g })}</p>
                </div>
              </Link>
            ) : (
              <div className="hero-card hero-card--quote" aria-hidden="true">
                <div className="product-photo product-photo--empty" />
                <div className="hero-card-body"><h3 className="hero-quote">{t(quoteKey)}</h3></div>
              </div>
            )}
          </div>
        </section>

        <PastryRow />

        <section className="section" id="menu">
          <div className="section-head">
            <span className="eyebrow">{t("menu.section.eyebrow")}</span>
            <h2>{t("menu.section.title")}</h2>
          </div>
          </div>
          <FilterBar categories={cats} value={filter} onChange={handleChange} />
          {state === "loading" ? (
            <>
              <div className="baking" aria-hidden="true">
                <span className="baking-oven">
                  <Sprite sprite={OVEN} />
                  <Sprite sprite={OVEN_GLOW} className="baking-glow" />
                </span>
                <p>{t("menu.loading")}</p>
              </div>
              <div className="grid-menu" aria-label={t("menu.loading.label")}>
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="skeleton" aria-hidden="true" />
                ))}
              </div>
            </>
          ) : state === "error" ? (
            <div className="state" role="alert">
              <Sprite sprite={CAT_HEAD} />
              <h2>{t("menu.error.title")}</h2>
              <p>{errorMsg ?? t("menu.error.generic")}</p>
              <button type="button" className="btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
                {t("menu.error.retry")}
              </button>
            </div>
          ) : prods.length === 0 ? (
            <div className="state" role="status">
              <Sprite sprite={CAT_HEAD} />
              <h2>{t("menu.empty.title")}</h2>
              <p>{t("menu.empty.hint")}</p>
              <button type="button" className="btn-secondary" onClick={() => handleChange({ kind: "all" })}>
                {t("menu.empty.showAll")}
              </button>
            </div>
          ) : (
            <div className="grid-menu">
              {prods.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer categories={cats} />
    </div>
  );
}
