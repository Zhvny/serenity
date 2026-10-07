import { Link } from "react-router";
import type { Category } from "../services/api.ts";
import { Sprite } from "../pixel/Sprite.tsx";
import { LOGO_MARK } from "../pixel/data/logo.ts";
import { CAT_SLEEP } from "../pixel/data/mascot.ts";
import { SHOP_BELL, PAPER_BAG } from "../pixel/data/bakeryB.ts";
import { BREAD_LOAF } from "../pixel/data/bakeryA.ts";
import { SoundToggle } from "./SoundToggle.tsx";
import { useLang } from "../i18n/useLang.ts";
import { useT } from "../i18n/t.ts";
import { categoryLabel } from "../i18n/content.ts";

export function Footer({ categories = [] }: { categories?: Pick<Category, "id" | "name">[] }) {
  const year = new Date().getFullYear();
  const [lang] = useLang();
  const t = useT();
  return (
    <footer className="site-footer">
      <div className="gingham-strip" aria-hidden="true" />
      <div className="footer-grid">
        <div className="footer-brand">
          <span className="footer-logo"><Sprite sprite={LOGO_MARK} /> Serenity</span>
          <p>{t("shell.footer.tagline")}</p>
        </div>
        <nav className="footer-col" aria-label={t("shell.footer.links")}>
          <h3>{t("shell.footer.explore")}</h3>
          <Link to="/">{t("shell.footer.menu")}</Link>
          <Link to="/cart">{t("shell.nav.cart")}</Link>
        </nav>
        {categories.length > 0 ? (
          <nav className="footer-col" aria-label={t("shell.footer.categories")}>
            <h3>{t("shell.footer.categories")}</h3>
            {categories.map((c) => (
              <Link key={c.id} to={`/?category=${c.id}`}>{categoryLabel(c, lang)}</Link>
            ))}
          </nav>
        ) : null}
      </div>
      <div className="footer-sound">
        <SoundToggle where="footer" />
      </div>
      <div className="footer-base">
        <Sprite sprite={SHOP_BELL} className="footer-prop" />
        <Sprite sprite={BREAD_LOAF} className="footer-prop" />
        <Sprite sprite={CAT_SLEEP} />
        <Sprite sprite={PAPER_BAG} className="footer-prop" />
        <small><span className="copy-sign">©</span> {year} Serenity · {t("shell.footer.base")}</small>
      </div>
    </footer>
  );
}
