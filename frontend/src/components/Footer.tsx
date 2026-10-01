import { Link } from "react-router";
import type { Category } from "../services/api.ts";
import { Icon } from "./Icon.tsx";

export function Footer({ categories = [] }: { categories?: Pick<Category, "id" | "name">[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <span className="footer-logo"><Icon name="leaf" /> Serenity</span>
          <p>Pre-order dessert &amp; minuman sehat rendah gula, dibuat segar. Pesan, bayar QRIS, ambil atau antar.</p>
        </div>
        <nav className="footer-col" aria-label="Tautan">
          <h3>Jelajah</h3>
          <Link to="/">Menu</Link>
          <Link to="/cart">Keranjang</Link>
        </nav>
        {categories.length > 0 ? (
          <nav className="footer-col" aria-label="Kategori">
            <h3>Kategori</h3>
            {categories.map((c) => (
              <Link key={c.id} to={`/?category=${c.id}`}>{c.name}</Link>
            ))}
          </nav>
        ) : null}
      </div>
      <div className="footer-base">
        <small>© {year} Serenity · Healthy Pre-Order</small>
      </div>
    </footer>
  );
}
