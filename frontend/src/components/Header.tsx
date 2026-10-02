import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getCart } from "../services/api.ts";
import type { Category } from "../services/api.ts";
import { Icon } from "./Icon.tsx";

const THEME_KEY = "serenity-theme";
export type Theme = "light" | "dark";

function initialTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function Header({ categories = [] }: { categories?: Pick<Category, "id" | "name">[] }) {
  const [count, setCount] = useState<number | null>(0);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get("category");

  useEffect(() => {
    let alive = true;
    async function refresh(): Promise<void> {
      try {
        const items = await getCart();
        if (alive) setCount(items.reduce((s, i) => s + (i.quantity ?? 0), 0));
      } catch {
        if (alive) setCount(null);
      }
    }
    void refresh();
    window.addEventListener("cart:changed", refresh);
    return () => {
      alive = false;
      window.removeEventListener("cart:changed", refresh);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "dark" ? "dark" : "";
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      // abaikan (mode privat)
    }
  }, [theme]);

  return (
    <header className="site-header">
      <Link to="/" className="logo"><Icon name="leaf" /> Serenity</Link>
      <nav aria-label="Kategori">
        {categories.map((c) => (
          <Link key={c.id} to={`/?category=${c.id}`} aria-current={activeCategory === c.id ? "page" : undefined}>{c.name}</Link>
        ))}
      </nav>
      <Link to="/riwayat" className="header-link">Riwayat</Link>
      <div className="header-actions">
        <button
          type="button"
          className="theme-toggle"
          aria-label={theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
          aria-pressed={theme === "dark"}
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
        <Link to="/cart" className="header-cart" aria-label="Keranjang">
          <Icon name="cart" />
          {count !== null ? <span className="cart-badge">{count}</span> : null}
        </Link>
      </div>
    </header>
  );
}
