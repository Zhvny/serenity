import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  adminLogin,
  adminLogout,
  adminListProducts,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeactivateProduct,
  adminReactivateProduct,
  adminListOrders,
  adminOrderDetail,
  adminAdvanceOrder,
  adminMarkPaid,
  adminSettleParent,
  adminCreatePost,
  type Product,
  type PendingOrder,
  type OrderDetail,
} from "../services/api.ts";
import { rupiah } from "../utils/format.ts";
import "./admin.css";

type Form = { id: string; name: string; category_id: string; price: number; tagsInput: string; nameEn: string; descEn: string };
const EMPTY: Form = { id: "", name: "", category_id: "cat_food", price: 0, tagsInput: "", nameEn: "", descEn: "" };
type Tab = "orders" | "products" | "posts";

function useDesktop(): boolean {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(min-width: 921px)").matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(min-width: 921px)");
    const fn = () => setDesktop(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return desktop;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const ORDER_DOT: Record<string, string> = {
  paid: "history-dot history-dot--paid",
  underpaid: "history-dot history-dot--underpaid",
  pending_payment: "history-dot history-dot--pending",
};

const ORDER_FILTERS: Array<{ key: string; label: string }> = [
  { key: "pending_payment", label: "Menunggu bayar" },
  { key: "underpaid", label: "Kurang bayar" },
  { key: "paid", label: "Lunas" },
  { key: "preparing", label: "Disiapkan" },
  { key: "ready", label: "Siap" },
  { key: "done", label: "Selesai" },
  { key: "expired", label: "Kedaluwarsa" },
  { key: "cancelled", label: "Dibatalkan" },
];
const STATUS_LABEL: Record<string, string> = { pending_payment: "Menunggu pembayaran", underpaid: "Kurang bayar", paid: "Lunas", preparing: "Disiapkan", ready: "Siap diambil/antar", done: "Selesai", expired: "Kedaluwarsa", cancelled: "Dibatalkan" };
const ADVANCE_LABEL: Record<string, string> = { paid: "Mulai Siapkan", preparing: "Tandai Siap", ready: "Tandai Selesai" };

export function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [booting, setBooting] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("orders");
  const [orderFilter, setOrderFilter] = useState("pending_payment");
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [paidInput, setPaidInput] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postExcerpt, setPostExcerpt] = useState("");
  const [postTitleEn, setPostTitleEn] = useState("");
  const [postBodyEn, setPostBodyEn] = useState("");
  const [postExcerptEn, setPostExcerptEn] = useState("");
  const [postTag, setPostTag] = useState("FunFact");
  const [postImage, setPostImage] = useState("");
  const [postPids, setPostPids] = useState<string[]>([]);
  const [postMsg, setPostMsg] = useState("");
  const [postImgOk, setPostImgOk] = useState(true);
  const desktop = useDesktop();
  const formRef = useRef<HTMLElement>(null);

  function togglePid(id: string): void {
    setPostPids((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function refreshProducts(): Promise<void> {
    const list = await adminListProducts();
    setProducts(list);
    setLoggedIn(true);
    setLoadError("");
  }

  async function refreshOrders(status: string): Promise<void> {
    const list = await adminListOrders(status);
    setOrders(list);
    setLoggedIn(true);
  }

  function onError(e: unknown, fallback: string): void {
    if (e instanceof ApiError && e.code === "UNAUTH") { setLoggedIn(false); return; }
    setError(e instanceof Error ? e.message : fallback);
  }

  async function refresh(): Promise<void> {
    try {
      await Promise.all([refreshProducts(), refreshOrders(orderFilter)]);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === "UNAUTH") setLoggedIn(false);
      else setLoadError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setBooting(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state di-set async setelah await
    void refresh();
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- muat ulang daftar saat filter berubah
    refreshOrders(orderFilter).catch((e: unknown) => onError(e, "Gagal memuat pesanan"));
    setDetail(null);
  }, [orderFilter, loggedIn]);

  async function handleLogin(username: string, password: string): Promise<void> {
    await adminLogin(username, password);
    await refresh();
  }
  async function handleLogout(): Promise<void> {
    await adminLogout();
    setLoggedIn(false);
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError("");
    const tags = form.tagsInput.split(",").map((t) => t.trim()).filter((t) => t !== "");
    try {
      const opt = (v: string): string | undefined => (v.trim() === "" ? undefined : v.trim());
      if (editingId !== null) {
        await adminUpdateProduct(editingId, { name: form.name, category_id: form.category_id, price: form.price, tags, name_en: opt(form.nameEn), description_en: opt(form.descEn) });
      } else {
        await adminCreateProduct({ id: form.id, name: form.name, category_id: form.category_id, price: form.price, tags, name_en: opt(form.nameEn), description_en: opt(form.descEn) });
      }
      setForm(EMPTY);
      setEditingId(null);
      await refreshProducts();
    } catch (e: unknown) {
      onError(e, editingId !== null ? "Gagal menyimpan perubahan" : "Gagal menambah produk");
    }
  }

  function startEdit(p: Product): void {
    setEditingId(p.id);
    setForm({ id: p.id, name: p.name, category_id: p.category_id, price: p.price, tagsInput: p.tags.join(", "), nameEn: p.name_en ?? "", descEn: p.description_en ?? "" });
    setError("");
    setTab("products");
  }
  function cancelEdit(): void { setEditingId(null); setForm(EMPTY); }

  useEffect(() => {
    if (editingId !== null && typeof formRef.current?.scrollIntoView === "function") {
      formRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [editingId]);

  const knownTags = [...new Set(products.flatMap((p) => p.tags))];
  function addTag(t: string): void {
    const cur = form.tagsInput.split(",").map((x) => x.trim()).filter((x) => x !== "");
    if (!cur.includes(t)) setForm({ ...form, tagsInput: [...cur, t].join(", ") });
  }

  async function act(fn: () => Promise<unknown>, fallback: string): Promise<void> {
    setError("");
    try { await fn(); await refresh(); } catch (e: unknown) { onError(e, fallback); }
  }

  async function openDetail(code: string): Promise<void> {
    setError("");
    try {
      const d = await adminOrderDetail(code);
      setDetail(d);
      setPaidInput(String(d.total_amount));
    } catch (e: unknown) { onError(e, "Gagal memuat detail"); }
  }

  async function handleMarkPaid(code: string, paidAmount: number): Promise<string | null> {
    let status: string | null = null;
    await act(() => adminMarkPaid(code, paidAmount).then((r) => { status = r.status; }), "Gagal menandai lunas");
    if (detail?.unique_code === code) await openDetail(code);
    return status;
  }
  async function handleSettle(code: string): Promise<void> {
    await act(() => adminSettleParent(code), "Gagal melunaskan");
    if (detail?.unique_code === code) await openDetail(code);
  }

  async function handlePostSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setPostMsg("");
    if (postTitle.trim() === "" || postBody.trim() === "") {
      setPostMsg("Judul dan isi wajib diisi.");
      return;
    }
    try {
      const opt = (v: string): string | null => (v.trim() === "" ? null : v.trim());
      await adminCreatePost({ title: postTitle.trim(), body: postBody.trim(), excerpt: postExcerpt.trim() === "" ? null : postExcerpt.trim(), title_en: opt(postTitleEn), body_en: opt(postBodyEn), excerpt_en: opt(postExcerptEn), tag: postTag, product_id: null, image_url: postImage.trim() === "" ? null : postImage.trim(), product_ids: postPids });
      setPostTitle("");
      setPostBody("");
      setPostExcerpt("");
      setPostTitleEn("");
      setPostBodyEn("");
      setPostExcerptEn("");
      setPostImage("");
      setPostPids([]);
      setPostMsg("Post tersimpan.");
    } catch (err: unknown) {
      onError(err, "Gagal menyimpan post");
    }
  }
  async function handleAdvance(code: string): Promise<void> {
    await act(() => adminAdvanceOrder(code), "Gagal memajukan status");
    if (detail?.unique_code === code) await openDetail(code);
  }
  async function handleDeactivate(id: string): Promise<void> { await act(() => adminDeactivateProduct(id), "Gagal menonaktifkan"); }
  async function handleReactivate(id: string): Promise<void> { await act(() => adminReactivateProduct(id), "Gagal mengaktifkan"); }

  if (booting) {
    return (
      <main className="admin-page" aria-label="Memuat admin">
        <div className="skeleton" aria-hidden="true" />
      </main>
    );
  }
  if (!loggedIn) return <LoginForm onLogin={handleLogin} />;

  return (
    <main className="admin-page">
      <div className="admin-head">
        <span className="admin-brand">Serenity · Admin</span>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={() => void handleLogout()}>Logout</button>
      </div>

      <nav className="admin-tabs" aria-label="Bagian admin">
        <button type="button" className={tab === "orders" ? "admin-tab admin-tab--active" : "admin-tab"} aria-pressed={tab === "orders"} onClick={() => setTab("orders")}>Pesanan</button>
        <button type="button" className={tab === "products" ? "admin-tab admin-tab--active" : "admin-tab"} aria-pressed={tab === "products"} onClick={() => setTab("products")}>Produk</button>
        <button type="button" className={tab === "posts" ? "admin-tab admin-tab--active" : "admin-tab"} aria-pressed={tab === "posts"} onClick={() => setTab("posts")}>Post</button>
      </nav>

      {error !== "" ? <p className="admin-error" role="alert">{error}</p> : null}
      {loadError !== "" ? <p className="admin-error" role="alert">{loadError}</p> : null}

      {tab === "orders" ? (
        <div className="admin-orders">
          <section className="admin-section">
            <div className="admin-filters" role="group" aria-label="Filter status pesanan">
              {ORDER_FILTERS.map((f) => (
                <button key={f.key} type="button" className={orderFilter === f.key ? "chip chip--active" : "chip"} aria-pressed={orderFilter === f.key} onClick={() => setOrderFilter(f.key)}>{f.label}</button>
              ))}
            </div>
            {orders.length === 0 ? (
              <p className="admin-empty">Tidak ada pesanan pada status ini.</p>
            ) : desktop ? (
              <div className="admin-table-wrap" tabIndex={0} role="region" aria-label="Tabel pesanan, geser horizontal">
              <table className="admin-table">
                <thead><tr><th scope="col">Order</th><th scope="col">Nominal</th><th scope="col">Metode</th><th scope="col">Aksi</th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className={detail?.unique_code === o.unique_code ? "is-selected" : ""}>
                      <td><button type="button" className="admin-link" aria-label={`Detail ${o.unique_code}`} onClick={() => void openDetail(o.unique_code)}>{o.id}</button><br /><small className="admin-id">{o.unique_code}</small></td>
                      <td className="admin-price">{rupiah(o.total_amount)}{o.paid_amount !== null && o.paid_amount !== undefined ? <><br /><small className="admin-id">Dibayar {rupiah(o.paid_amount)}</small></> : null}</td>
                      <td>{o.delivery_method === "delivery" ? "Diantar" : "Ambil sendiri"}</td>
                      <td>
                        {o.status === "pending_payment" ? (
                          <button type="button" className="admin-btn" aria-label={`Tandai lunas ${o.unique_code}`} onClick={() => void handleMarkPaid(o.unique_code, o.total_amount)}>Tandai Lunas</button>
                        ) : o.status === "underpaid" ? (
                          <button type="button" className="admin-btn" aria-label={`Periksa ${o.unique_code}`} onClick={() => void openDetail(o.unique_code)}>Periksa</button>
                        ) : ADVANCE_LABEL[o.status] !== undefined ? (
                          <button type="button" className="admin-btn" aria-label={`Majukan ${o.unique_code}`} onClick={() => void handleAdvance(o.unique_code)}>{ADVANCE_LABEL[o.status]}</button>
                        ) : <span className="status-badge status-badge--ok">{STATUS_LABEL[o.status] ?? "Selesai"}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : (
              <ul className="order-cards">
                {orders.map((o) => (
                  <li key={o.id} className={detail?.unique_code === o.unique_code ? "order-card is-selected" : "order-card"}>
                    <span className={ORDER_DOT[o.status] ?? "history-dot"} aria-hidden="true" />
                    <div className="order-card-main">
                      <span className="status-badge">{STATUS_LABEL[o.status] ?? o.status}</span>
                      <span className="order-card-total">{rupiah(o.total_amount)}</span>
                      {o.paid_amount !== null && o.paid_amount !== undefined ? (
                        <span className="history-sub">Dibayar {rupiah(o.paid_amount)}</span>
                      ) : null}
                      <span className="history-code">{o.unique_code}</span>
                      <span className="history-date">{fmtDate(o.created_at)} · {o.delivery_method === "delivery" ? "Diantar" : "Ambil sendiri"}</span>
                    </div>
                    <div className="order-card-actions">
                      {o.status === "pending_payment" ? (
                        <button type="button" className="admin-btn" aria-label={`Tandai lunas ${o.unique_code}`} onClick={() => void handleMarkPaid(o.unique_code, o.total_amount)}>Tandai Lunas</button>
                      ) : o.status === "underpaid" ? (
                        <button type="button" className="admin-btn" aria-label={`Periksa ${o.unique_code}`} onClick={() => void openDetail(o.unique_code)}>Periksa</button>
                      ) : ADVANCE_LABEL[o.status] !== undefined ? (
                        <button type="button" className="admin-btn" aria-label={`Majukan ${o.unique_code}`} onClick={() => void handleAdvance(o.unique_code)}>{ADVANCE_LABEL[o.status]}</button>
                      ) : null}
                      <button type="button" className="admin-btn admin-btn--ghost" aria-label={`Detail ${o.unique_code}`} onClick={() => void openDetail(o.unique_code)}>Detail</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {detail !== null ? (
            <aside className="admin-section admin-detail" aria-label="Detail pesanan">
              <h2 className="admin-subhead">Detail {detail.id}</h2>
              <p className="admin-detail-row"><span>Kode</span><strong>{detail.unique_code}</strong></p>
              <p className="admin-detail-row"><span>Status</span><strong>{STATUS_LABEL[detail.status] ?? detail.status}</strong></p>
              <p className="admin-detail-row"><span>Total</span><strong>{rupiah(detail.total_amount)}</strong></p>
              {detail.paid_amount !== null && detail.paid_amount !== undefined ? (
                <p className="admin-detail-row"><span>Dibayar</span><strong>{rupiah(detail.paid_amount)} dari {rupiah(detail.total_amount)}</strong></p>
              ) : null}
              <p className="admin-detail-row"><span>Metode</span><strong>{detail.delivery_method === "delivery" ? "Diantar" : "Ambil sendiri"}</strong></p>
              {detail.delivery_method === "delivery" && detail.delivery_address !== null ? (
                <p className="admin-detail-row"><span>Alamat</span><strong>{detail.delivery_address}</strong></p>
              ) : null}
              <h3 className="admin-detail-sub">Item</h3>
              <ul className="admin-detail-items">
                {detail.items.map((it, i) => (
                  <li key={`${it.product_id}-${i}`}>{it.quantity}× {it.name}{it.note !== null && it.note !== "" ? ` — ${it.note}` : ""} <span className="admin-price">{rupiah(it.price_at_order * it.quantity)}</span></li>
                ))}
              </ul>
              <div className="admin-detail-actions">
                {detail.status === "pending_payment" ? (
                  <>
                    <label htmlFor="paid-amount">Nominal masuk</label>
                    <input id="paid-amount" type="number" min={1} value={paidInput} onChange={(e) => setPaidInput(e.target.value)} />
                    {Number(paidInput) < detail.total_amount ? (
                      <button type="button" className="admin-btn" onClick={() => void handleMarkPaid(detail.unique_code, Number(paidInput) || 0).then((s) => { if (s === "underpaid") setOrderFilter("underpaid"); })}>Catat Kurang Bayar</button>
                    ) : (
                      <button type="button" className="admin-btn" onClick={() => void handleMarkPaid(detail.unique_code, Number(paidInput) || 0)}>Tandai Lunas</button>
                    )}
                  </>
                ) : detail.status === "underpaid" ? (
                  <button type="button" className="admin-btn" aria-label={`Lunaskan ${detail.unique_code}`} onClick={() => void handleSettle(detail.unique_code)}>Lunaskan</button>
                ) : ADVANCE_LABEL[detail.status] !== undefined ? (
                  <button type="button" className="admin-btn" onClick={() => void handleAdvance(detail.unique_code)}>{ADVANCE_LABEL[detail.status]}</button>
                ) : <span className="status-badge status-badge--ok">Pesanan selesai</span>}
                <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setDetail(null)}>Tutup</button>
              </div>
            </aside>
          ) : null}
        </div>
      ) : tab === "products" ? (
        <div className="admin-orders">
          <aside ref={formRef} className="admin-section admin-detail" aria-label="Form produk">
            <h2 className="admin-subhead">{editingId !== null ? `Edit produk: ${editingId}` : "Tambah produk"}</h2>
            <form className="admin-form" onSubmit={(e) => void handleSubmit(e)}>
              <label htmlFor="prod-id">ID Produk</label>
              <input id="prod-id" type="text" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} required disabled={editingId !== null} />
              <label htmlFor="prod-name">Nama</label>
              <input id="prod-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <label htmlFor="prod-name-en">Nama Inggris (opsional — kosong = tampil Indonesia)</label>
              <input id="prod-name-en" type="text" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} maxLength={200} />
              <label htmlFor="prod-desc-en">Deskripsi Inggris (opsional — kosong = tampil Indonesia)</label>
              <input id="prod-desc-en" type="text" value={form.descEn} onChange={(e) => setForm({ ...form, descEn: e.target.value })} />
              <label htmlFor="prod-cat">Kategori</label>
              <select id="prod-cat" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="cat_food">Food</option>
                <option value="cat_drink">Drink</option>
                <option value="cat_dessert">Dessert</option>
              </select>
              <label htmlFor="prod-price">Harga (min 1)</label>
              <input id="prod-price" type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: Number.parseInt(e.target.value, 10) || 0 })} required />
              <label htmlFor="prod-tags">Tags (pisah koma)</label>
              <input id="prod-tags" type="text" value={form.tagsInput} onChange={(e) => setForm({ ...form, tagsInput: e.target.value })} />
              {knownTags.length > 0 ? (
                <div className="admin-tags" role="group" aria-label="Tag yang sudah ada">
                  <span className="admin-id">Tag yang sudah ada:</span>
                  {knownTags.map((t) => (
                    <button key={t} type="button" className="chip" onClick={() => addTag(t)}>{t}</button>
                  ))}
                </div>
              ) : null}
              <div className="admin-form-actions">
                <button type="submit" className="admin-btn">{editingId !== null ? "Simpan Perubahan" : "Tambah Produk"}</button>
                {editingId !== null ? <button type="button" className="admin-btn admin-btn--ghost" onClick={cancelEdit}>Batal</button> : null}
              </div>
            </form>
          </aside>

          <section className="admin-section">
            <h2 className="admin-subhead">Daftar produk</h2>            <ul className="admin-list">
              {products.map((p) => (
                <li key={p.id} className="admin-row">
                  <div className="admin-row-main">
                    <div className="admin-row-top">
                      <h3>{p.name}</h3>
                      <span className={p.is_active ? "status-badge status-badge--ok" : "status-badge"}>{p.is_active ? "Aktif" : "Nonaktif"}</span>
                    </div>
                    <p className="admin-row-meta"><span className="admin-id">{p.id}</span><span className="admin-price">Rp {p.price.toLocaleString("id-ID")}</span></p>
                  </div>
                  <div className="admin-row-actions">
                    <button type="button" className="admin-btn admin-btn--ghost" aria-label={`Edit ${p.name}`} onClick={() => startEdit(p)}>Edit</button>
                    {p.is_active ? (
                      <button type="button" className="admin-btn admin-btn--ghost-danger" onClick={() => void handleDeactivate(p.id)}>Nonaktifkan</button>
                    ) : (
                      <button type="button" className="admin-btn" onClick={() => void handleReactivate(p.id)}>Aktifkan</button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <section className="admin-section">
          <h2 className="admin-subhead">Tambah Post (FunFact / News / SoftSelling)</h2>
          <div className="post-editor">
          <form className="admin-form" onSubmit={(e) => void handlePostSubmit(e)}>
            <label htmlFor="post-title">Judul</label>
            <input id="post-title" type="text" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} required aria-required="true" maxLength={200} />
            <label htmlFor="post-excerpt">Ringkasan untuk kartu (opsional, maks 300)</label>
            <input id="post-excerpt" type="text" value={postExcerpt} onChange={(e) => setPostExcerpt(e.target.value)} maxLength={300} placeholder="Satu-dua kalimat…" />
            <label htmlFor="post-title-en">Judul Inggris (opsional — kosong = tampil Indonesia)</label>
            <input id="post-title-en" type="text" value={postTitleEn} onChange={(e) => setPostTitleEn(e.target.value)} maxLength={200} />
            <label htmlFor="post-body-en">Isi Inggris (opsional)</label>
            <textarea id="post-body-en" value={postBodyEn} onChange={(e) => setPostBodyEn(e.target.value)} maxLength={10000} rows={4} />
            <label htmlFor="post-excerpt-en">Ringkasan Inggris (opsional, maks 300)</label>
            <input id="post-excerpt-en" type="text" value={postExcerptEn} onChange={(e) => setPostExcerptEn(e.target.value)} maxLength={300} />
            <label htmlFor="post-body">Isi</label>
            <textarea id="post-body" value={postBody} onChange={(e) => setPostBody(e.target.value)} required aria-required="true" maxLength={10000} rows={8} />
            <label htmlFor="post-tag">Tag</label>
            <select id="post-tag" value={postTag} onChange={(e) => setPostTag(e.target.value)}>
              <option value="FunFact">FunFact</option>
              <option value="News">News</option>
              <option value="Research">Research</option>
            </select>
            <label htmlFor="post-image">URL gambar (opsional)</label>
            <input id="post-image" type="url" value={postImage} onChange={(e) => { setPostImage(e.target.value); setPostImgOk(true); }} maxLength={500} placeholder="https://…" />
            {products.length > 0 ? (
              <div className="admin-checklist" role="group" aria-label="Produk yang disarankan">
                <span className="admin-id">Produk yang disarankan:</span>
                {products.map((p) => (
                  <label key={p.id} className="check-row">
                    <input type="checkbox" checked={postPids.includes(p.id)} onChange={() => togglePid(p.id)} aria-label={p.name} />
                    <span>{p.name}</span>
                    <span className="admin-price">Rp {p.price.toLocaleString("id-ID")}</span>
                  </label>
                ))}
              </div>
            ) : null}
            <div className="admin-form-actions">
              <button type="submit" className="admin-btn" disabled={postTitle.trim() === "" || postBody.trim() === ""}>Simpan Post</button>
            </div>
            {postMsg !== "" ? <p role="status">{postMsg}</p> : null}
          </form>
          <div className="post-preview" aria-label="Pratinjau post" aria-live="off">
            <p className="admin-subhead">Pratinjau</p>
            {postImage.trim() !== "" && postImgOk ? (
              <img className="post-image" src={postImage.trim()} alt="" onError={() => setPostImgOk(false)} />
            ) : (
              <div className="post-empty" role="img" aria-label="Belum ada gambar">Belum ada gambar</div>
            )}
            <p className="post-meta"><span className="fact-tag">{postTag}</span></p>
            <h3>{postTitle.trim() === "" ? "Judul post…" : postTitle}</h3>
            <p className="post-body">{postBody.trim() === "" ? "Isi post…" : postBody}</p>
            {postPids.length > 0 ? (
              <>
                <h3 className="admin-detail-sub">Produk yang disarankan</h3>
                <ul className="admin-detail-items">
                  {postPids.map((id) => (
                    <li key={id}>{products.find((p) => p.id === id)?.name ?? id}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          </div>
        </section>
      )}
    </main>
  );
}

function LoginForm({ onLogin }: { onLogin: (u: string, p: string) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError("");
    try {
      await onLogin(username, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login gagal");
    }
  }

  return (
    <main className="admin-page admin-login">
      <div className="admin-card">
        <h1>Login Admin</h1>
        <form className="admin-form" onSubmit={(e) => void handleSubmit(e)}>
          <label htmlFor="login-user">Username</label>
          <input id="login-user" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <label htmlFor="login-pass">Password</label>
          <input id="login-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="admin-btn">Login</button>
          {error !== "" ? <p className="admin-error" role="alert">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}
