import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { getCart } from "../services/api.ts";
import type { Category } from "../services/api.ts";
import { Icon } from "./Icon.tsx";
import { Sprite } from "../pixel/Sprite.tsx";
import { SPROUT } from "../pixel/data/scene.ts";
import { PAPER_BAG, PAPER_BAG_OPEN } from "../pixel/data/bakeryB.ts";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { LanguageToggle } from "./LanguageToggle.tsx";
import { SoundToggle } from "./SoundToggle.tsx";
import { useLang } from "../i18n/useLang.ts";
import { useT } from "../i18n/t.ts";
import { categoryLabel } from "../i18n/content.ts";

export type { Theme } from "./ThemeToggle.tsx";

export function Header({ categories = [] }: { categories?: Pick<Category, "id" | "name">[] }) {
  const [count, setCount] = useState<number | null>(0);
  const [searchParams] = useSearchParams();
  const [lang] = useLang();
  const t = useT();
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

  return (
    <header className="site-header">
      <Link to="/" className="logo"><Sprite sprite={SPROUT} /> <span className="logo-text">Serenity</span></Link>
      <nav aria-label={t("shell.nav.categories")}>
        {categories.map((c) => (
          <Link key={c.id} to={`/menu?category=${c.id}`} aria-current={activeCategory === c.id ? "page" : undefined}>{categoryLabel(c, lang)}</Link>
        ))}
      </nav>
      <Link to="/riwayat" className="header-link" aria-label={t("shell.nav.history")}>
        <Icon name="receipt" className="link-icon" />
        <span className="link-text" aria-hidden="true">{t("shell.nav.history")}</span>
      </Link>
      <div className="header-actions">
        <LanguageToggle />
        <SoundToggle where="header" />
        <ThemeToggle />
        <Link to="/cart" className="header-cart" aria-label={t("shell.nav.cart")} data-cart-target>
          <Sprite sprite={PAPER_BAG} className="bag bag--closed" />
          <Sprite sprite={PAPER_BAG_OPEN} className="bag bag--open" />
          {count !== null ? <span className="cart-badge">{count}</span> : null}
        </Link>
      </div>
    </header>
  );
}
