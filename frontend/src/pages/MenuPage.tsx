import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { ApiError, getCategories, getProducts } from "../services/api.ts";
import type { Category, Product } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { FilterBar } from "../components/FilterBar.tsx";
import type { Filter } from "../components/FilterBar.tsx";
import { ProductCard } from "../components/ProductCard.tsx";
import { Icon } from "../components/Icon.tsx";
import { rupiah } from "../utils/format.ts";

const HERO_QUOTES = [
  "Sweeten your day, the wholesome way.",
  "Dessert can be kind to your body too.",
  "Good things, lightly sweetened.",
  "Treats that love you back.",
  "Sip sweet, stay light.",
];

export function MenuPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>(() => {
    const c = searchParams.get("category");
    return c === null ? { kind: "all" } : { kind: "category", id: c };
  });
  const [cats, setCats] = useState<Category[]>([]);
  const [prods, setProds] = useState<Product[]>([]);
  const [state, setState] = useState<"loading" | "error" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [shown, setShown] = useState(false);
  const [quote] = useState(() => HERO_QUOTES[Math.floor(Math.random() * HERO_QUOTES.length)] ?? HERO_QUOTES[0]);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 20);
    return () => clearTimeout(t);
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
        setErrorMsg(e instanceof ApiError ? e.message : "Terjadi kesalahan");
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
        <section className={`hero reveal${shown ? " is-in" : ""}`}>
          <div className="hero-copy">
            <span className="hero-eyebrow"><Icon name="leaf" /> Pre-order dessert &amp; minuman sehat</span>
            <h1>Manis yang menyayangi tubuhmu.</h1>
            <p className="lead">Dessert &amp; minuman sehat rendah gula, dibuat segar. Pesan sekarang atau jadwalkan, bayar QRIS, ambil atau antar.</p>
            <div className="hero-actions">
              <a className="btn-primary" href="#menu">Lihat Menu <Icon name="arrow-right" /></a>
              <a className="btn-secondary" href="#menu">Jelajahi kategori</a>
            </div>
          </div>
          <div className="hero-visual">
            {featured !== null ? (
              <article className="hero-card">
                {featured.image_url === null ? (
                  <div className="product-photo product-photo--empty" aria-hidden="true" />
                ) : (
                  <img className="product-photo" src={featured.image_url} alt={featured.name} loading="lazy" />
                )}
                <div className="hero-card-body">
                  <h3>{featured.name}</h3>
                  <p className="price">{rupiah(featured.price)}</p>
                  <div className="hero-card-stats">
                    <span><b>{featured.nutrition.calories_kcal}</b> kkal</span>
                    <span><b>{featured.nutrition.protein_g} g</b> protein</span>
                  </div>
                </div>
              </article>
            ) : (
              <div className="hero-card hero-card--quote" aria-hidden="true">
                <div className="product-photo product-photo--empty" />
                <div className="hero-card-body"><h3 className="hero-quote">{quote}</h3></div>
              </div>
            )}
          </div>
        </section>

        <section className="section" id="menu">
          <div className="section-head">
            <span className="eyebrow">Menu</span>
            <h2>Pilihan hari ini</h2>
          </div>
          <FilterBar categories={cats} value={filter} onChange={handleChange} />
          {state === "loading" ? (
            <div className="grid-menu" aria-label="Memuat menu">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton" aria-hidden="true" />
              ))}
            </div>
          ) : state === "error" ? (
            <div className="state" role="alert">
              <h2>Menu gagal dimuat</h2>
              <p>{errorMsg}</p>
              <button type="button" className="btn-primary" onClick={() => setReloadKey((k) => k + 1)}>
                Coba lagi
              </button>
            </div>
          ) : prods.length === 0 ? (
            <div className="state" role="status">
              <h2>Belum ada menu</h2>
              <p>Coba filter lain atau tampilkan semua menu.</p>
              <button type="button" className="btn-secondary" onClick={() => handleChange({ kind: "all" })}>
                Tampilkan semua
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
