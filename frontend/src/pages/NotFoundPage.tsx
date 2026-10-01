import { Link } from "react-router";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { Icon } from "../components/Icon.tsx";

export function NotFoundPage() {
  return (
    <div>
      <Header />
      <main className="pay-wrap">
        <div className="pay-card">
          <span className="pay-icon pay-icon--warn"><Icon name="warning" /></span>
          <h1>Halaman tidak ditemukan</h1>
          <p>Kode: 404 — halaman yang Anda cari tidak ada atau sudah dipindahkan.</p>
          <Link className="btn-primary btn-lg pay-cta" to="/">Kembali ke beranda</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
