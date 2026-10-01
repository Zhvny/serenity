import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { ApiError, getCategories, getProducts } from "../services/api.ts";
import type { Category, Product } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { FilterBar } from "../components/FilterBar.tsx";
import type { Filter } from "../components/FilterBar.tsx";
import { ProductCard } from "../components/ProductCard.tsx";

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

  return (
    <div>
      <Header categories={cats} />
      <main>
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
      </main>
    </div>
  );
}
