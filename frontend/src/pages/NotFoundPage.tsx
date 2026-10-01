import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="state">
      <h1>Halaman tidak ditemukan</h1>
      <p>Kode: 404</p>
      <Link className="btn-secondary" to="/">Kembali ke beranda</Link>
    </main>
  );
}
