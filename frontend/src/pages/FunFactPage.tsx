import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";

const FACTS = [
  {
    title: "Kenapa beli Serenity?",
    body: "Kami memisahkan proses alergen/non-alergen secara higienis — tanpa catatan cross-contamination. Setiap porsi lengkap nutrisi: kalori, protein, karbo, lemak, serat, gula.",
    tag: "Fun Fact",
  },
  {
    title: "Dessert sehat bukan mitos",
    body: "Serenity menggunakan bahan alami, tanpa pengawet berbahaya. Dessert sehat + minuman sehat — semua bisa dinikmati tanpa rasa bersalah.",
    tag: "News",
  },
  {
    title: "Pre-order = lebih segar",
    body: "Karena dibuat berdasarkan pesanan (bukan stok), makanan lebih segar dan sesuai preferensi Anda — dari diet hingga atlet.",
    tag: "Soft Selling",
  },
];

export function FunFactPage() {
  return (
    <div>
      <Header />
      <main className="content">
        <h1>Fun Fact & News — Serenity</h1>
        <p className="subtitle">Kenapa memilih Serenity? Ini cerita di balik dessert sehat kami.</p>
        <div className="facts-grid">
          {FACTS.map((f) => (
            <article key={f.title} className="fact-card" aria-label={f.title}>
              <span className="fact-tag">{f.tag}</span>
              <h2>{f.title}</h2>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
