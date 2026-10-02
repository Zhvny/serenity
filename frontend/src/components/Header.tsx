import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getCart } from "../services/api.ts";
import type { Category } from "../services/api.ts";
import { Icon } from "./Icon.tsx";

export function Header({ categories = [] }: { categories?: Pick<Category, "id" | "name">[] }) {
  const [count, setCount] = useState<number | null>(0);

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

  return (
    <header className="site-header">
      <Link to="/" className="logo"><Icon name="leaf" /> Serenity</Link>
      <nav aria-label="Kategori">
        {categories.map((c) => (
          <Link key={c.id} to={`/?category=${c.id}`}>{c.name}</Link>
        ))}
      </nav>
      <Link to="/riwayat">Riwayat</Link>
      <Link to="/cart" className="header-cart" aria-label="Keranjang">
        <Icon name="cart" />
        {count !== null ? <span className="cart-badge">{count}</span> : null}
      </Link>
    </header>
  );
}
