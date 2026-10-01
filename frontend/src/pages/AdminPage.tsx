import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  adminLogin,
  adminLogout,
  adminListProducts,
  adminCreateProduct,
  adminDeactivateProduct,
  type Product,
} from "../services/api.ts";
import "./admin.css";

type Form = { id: string; name: string; category_id: string; price: number; tagsInput: string };
const EMPTY: Form = { id: "", name: "", category_id: "cat_food", price: 0, tagsInput: "" };

export function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<Form>(EMPTY);

  async function refresh(): Promise<void> {
    try {
      const list = await adminListProducts();
      setProducts(list);
      setLoggedIn(true);
      setLoadError("");
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === "UNAUTH") {
        setLoggedIn(false);
      } else {
        setLoadError(e instanceof Error ? e.message : "Gagal memuat");
      }
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state di-set async setelah await (bukan sinkron)
    void refresh();
  }, []);

  async function handleLogin(username: string, password: string): Promise<void> {
    await adminLogin(username, password);
    await refresh();
  }

  async function handleLogout(): Promise<void> {
    await adminLogout();
    setLoggedIn(false);
  }

  async function handleCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError("");
    const tags = form.tagsInput.split(",").map((t) => t.trim()).filter((t) => t !== "");
    try {
      await adminCreateProduct({ id: form.id, name: form.name, category_id: form.category_id, price: form.price, tags });
      setForm(EMPTY);
      await refresh();
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === "UNAUTH") {
        setLoggedIn(false);
        return;
      }
      setError(e instanceof Error ? e.message : "Gagal menambah produk");
    }
  }

  async function handleDeactivate(id: string): Promise<void> {
    setError("");
    try {
      await adminDeactivateProduct(id);
      await refresh();
    } catch (e: unknown) {
      if (e instanceof ApiError && e.code === "UNAUTH") {
        setLoggedIn(false);
        return;
      }
      setError(e instanceof Error ? e.message : "Gagal menonaktifkan");
    }
  }

  if (!loggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <main className="admin-page">
      <div className="admin-head">
        <h1>Kelola Item</h1>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={() => void handleLogout()}>Logout</button>
      </div>
      {error !== "" ? <p className="admin-error" role="alert">{error}</p> : null}
      {loadError !== "" ? <p className="admin-error" role="alert">{loadError}</p> : null}

      <section className="admin-section">
        <h2 className="admin-subhead">Tambah produk</h2>
        <form className="admin-form" onSubmit={(e) => void handleCreate(e)}>
          <label htmlFor="prod-id">ID Produk</label>
          <input id="prod-id" type="text" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} required />
          <label htmlFor="prod-name">Nama</label>
          <input id="prod-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
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
          <button type="submit" className="admin-btn">Tambah Produk</button>
        </form>
      </section>

      <section className="admin-section">
        <h2 className="admin-subhead">Daftar produk</h2>
        <ul className="admin-list">
          {products.map((p) => (
            <li key={p.id} className="admin-row">
              <h3>{p.name}</h3>
              <span className="admin-id">{p.id}</span>
              <span className="admin-price">Rp {p.price.toLocaleString("id-ID")}</span>
              <span className={p.is_active ? "status-badge status-badge--ok" : "status-badge"}>{p.is_active ? "Aktif" : "Nonaktif"}</span>
              {p.is_active ? (
                <button type="button" className="admin-btn admin-btn--danger" onClick={() => void handleDeactivate(p.id)}>Nonaktifkan</button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
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
