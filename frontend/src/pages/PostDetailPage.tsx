import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getPost } from "../services/api.ts";
import type { PostDetail } from "../services/api.ts";
import { Header } from "../components/Header.tsx";
import { Footer } from "../components/Footer.tsx";
import { rupiah } from "../utils/format.ts";

export function PostDetailPage() {
  const { id } = useParams();
  const ref = id ?? "";
  const [state, setState] = useState<"loading" | "notfound" | "done">("loading");
  const [post, setPost] = useState<PostDetail | null>(null);

  useEffect(() => {
    if (ref === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ref kosong dari router
      setState("notfound");
      return;
    }
    let alive = true;
    getPost(ref)
      .then((p) => { if (alive) { setPost(p); setState("done"); } })
      .catch(() => { if (alive) setState("notfound"); });
    return () => { alive = false; };
  }, [ref]);

  if (state === "loading") {
    return (
      <div>
        <Header />
        <main className="content"><div className="skeleton" aria-label="Memuat post" /></main>
        <Footer />
      </div>
    );
  }
  if (state === "notfound" || post === null) {
    return (
      <div>
        <Header />
        <main className="content">
          <div className="state" role="alert">
            <h1>Post tidak ditemukan</h1>
            <Link className="btn-secondary" to="/funfact">Kembali ke Fun Fact</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  return (
    <div>
      <Header />
      <main className="content">
        <span className="fact-tag">{post.tag}</span>
        <h1>{post.title}</h1>
        {post.image_url !== null && post.image_url !== "" ? (
          <img className="post-image" src={post.image_url} alt={post.title} loading="lazy" />
        ) : null}
        <p className="post-body">{post.body}</p>
        {post.products.length > 0 ? (
          <section aria-label="Produk yang disarankan">
            <h2>Produk yang disarankan</h2>
            <div className="facts-grid">
              {post.products.map((p) => (
                <Link key={p.id} className="fact-card fact-card--link" to={`/products/${encodeURIComponent(p.id)}`} aria-label={p.name}>
                  {p.image_url !== null && p.image_url !== "" ? (
                    <img className="product-photo" src={p.image_url} alt="" loading="lazy" />
                  ) : null}
                  <h3>{p.name}</h3>
                  <p className="price">{rupiah(p.price)}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
        <p><Link className="btn-secondary" to="/funfact">Kembali ke Fun Fact</Link></p>
      </main>
      <Footer />
    </div>
  );
}
