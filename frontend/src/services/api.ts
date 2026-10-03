export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type Nutrition = { calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number; sugar_g: number };
export type Product = { id: string; name: string; category_id: string; price: number; tags: string[]; image_url: string | null; description: string | null; is_active: boolean; nutrition: Nutrition; allergens: string[] };
export type Category = { id: string; name: string; description: string | null };
export type CartItem = { item_id: string; product_id: string; quantity: number; note: string | null };

const BASE = import.meta.env.VITE_API_URL as string | undefined ?? "http://localhost:3000/api/v1";

export async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { credentials: "include" });
  } catch {
    throw new ApiError("NETWORK", "Tidak dapat menghubungi server");
  }
  const body = (await res.json()) as { status: string; data?: T; code?: string; message?: string };
  if (!res.ok || body.status !== "success") {
    throw new ApiError(body.code ?? "UNKNOWN", body.message ?? "Terjadi kesalahan");
  }
  return body.data as T;
}

export async function apiPost<T>(path: string, input: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), credentials: "include" });
  } catch {
    throw new ApiError("NETWORK", "Tidak dapat menghubungi server");
  }
  const body = (await res.json()) as { status: string; data?: T; code?: string; message?: string };
  if (!res.ok || body.status !== "success") {
    throw new ApiError(body.code ?? "UNKNOWN", body.message ?? "Terjadi kesalahan");
  }
  return body.data as T;
}

export async function apiPut<T>(path: string, input: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(input), credentials: "include" });
  } catch {
    throw new ApiError("NETWORK", "Tidak dapat menghubungi server");
  }
  const body = (await res.json()) as { status: string; data?: T; code?: string; message?: string };
  if (!res.ok || body.status !== "success") {
    throw new ApiError(body.code ?? "UNKNOWN", body.message ?? "Terjadi kesalahan");
  }
  return body.data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method: "DELETE", credentials: "include" });
  } catch {
    throw new ApiError("NETWORK", "Tidak dapat menghubungi server");
  }
  const body = (await res.json()) as { status: string; data?: T; code?: string; message?: string };
  if (!res.ok || body.status !== "success") {
    throw new ApiError(body.code ?? "UNKNOWN", body.message ?? "Terjadi kesalahan");
  }
  return body.data as T;
}
export function getCategories(): Promise<Category[]> {
  return apiGet<Category[]>("/categories");
}

export function getProducts(filter: { category?: string; tag?: string }): Promise<Product[]> {
  const q = new URLSearchParams();
  if (filter.category !== undefined) q.set("category", filter.category);
  if (filter.tag !== undefined) q.set("tag", filter.tag);
  const s = q.toString();
  return apiGet<Product[]>(s === "" ? "/products" : `/products?${s}`);
}

export function getProduct(id: string): Promise<Product> {
  return apiGet<Product>(`/products/${encodeURIComponent(id)}`);
}

export function addToCart(input: { product_id: string; quantity: number; note?: string }): Promise<CartItem> {
  return apiPost<CartItem>("/cart/add", input);
}

export function getCart(): Promise<CartItem[]> {
  return apiGet<CartItem[]>("/cart");
}

export function updateCartItem(item_id: string, quantity: number, note?: string | null): Promise<CartItem> {
  return apiPut<CartItem>(`/cart/items/${encodeURIComponent(item_id)}`, note === undefined ? { quantity } : { quantity, note });
}

export function removeCartItem(item_id: string): Promise<{ removed: boolean }> {
  return apiDelete<{ removed: boolean }>(`/cart/items/${encodeURIComponent(item_id)}`);
}

export type DeliveryMethod = "pickup" | "delivery";

export function checkoutCart(input: { mode: "instant" | "scheduled"; scheduled_at?: string; delivery_method: DeliveryMethod; delivery_address?: string | null; delivery_lat?: number | null; delivery_lng?: number | null }): Promise<{ mode: string; delivery_method: DeliveryMethod; delivery_address: string | null; items: CartItem[] }> {
  return apiPost<{ mode: string; delivery_method: DeliveryMethod; delivery_address: string | null; items: CartItem[] }>("/cart/checkout", input);
}

// --- Admin ---

async function parse<T>(res: Response): Promise<T> {
  const body = (await res.json()) as { status: string; data?: T; code?: string; message?: string };
  if (!res.ok || body.status !== "success") {
    throw new ApiError(body.code ?? "UNKNOWN", body.message ?? "Terjadi kesalahan");
  }
  return body.data as T;
}

// Ambil token CSRF (set cookie csrf_token + kembalikan token untuk header x-csrf-token).
async function getCsrf(): Promise<string> {
  const res = await fetch(`${BASE}/csrf`, { credentials: "include" });
  return parse<{ csrfToken: string }>(res).then((d) => d.csrfToken);
}

async function adminMutate<T>(path: string, method: "POST" | "PUT", input?: unknown): Promise<T> {
  const token = await getCsrf();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { "content-type": "application/json", "x-csrf-token": token },
      body: input === undefined ? undefined : JSON.stringify(input),
      credentials: "include",
    });
  } catch {
    throw new ApiError("NETWORK", "Tidak dapat menghubungi server");
  }
  return parse<T>(res);
}

export function adminLogin(username: string, password: string): Promise<null> {
  return adminMutate<null>("/admin/login", "POST", { username, password });
}

export function adminLogout(): Promise<null> {
  return adminMutate<null>("/admin/logout", "POST");
}

export function adminListProducts(): Promise<Product[]> {
  return apiGet<Product[]>("/admin/products");
}

export function adminCreateProduct(product: { id: string; name: string; category_id: string; price: number; tags: string[]; image_url?: string | null }): Promise<{ id: string }> {
  return adminMutate<{ id: string }>("/admin/products", "POST", product);
}

export function adminDeactivateProduct(id: string): Promise<{ deactivated: boolean }> {
  return adminMutate<{ deactivated: boolean }>(`/admin/products/${encodeURIComponent(id)}/deactivate`, "POST");
}

export function adminReactivateProduct(id: string): Promise<{ reactivated: boolean }> {
  return adminMutate<{ reactivated: boolean }>(`/admin/products/${encodeURIComponent(id)}/reactivate`, "POST");
}

export function adminUpdateProduct(id: string, product: { name: string; category_id: string; price: number; tags: string[]; image_url?: string | null; description?: string | null }): Promise<{ id: string }> {
  return adminMutate<{ id: string }>(`/admin/products/${encodeURIComponent(id)}`, "PUT", product);
}

export type PendingOrder = { id: string; unique_code: string; total_amount: number; paid_amount: number | null; status: string; delivery_method: string; created_at: string };

export function adminListOrders(status = "pending_payment"): Promise<PendingOrder[]> {
  return apiGet<PendingOrder[]>(`/admin/orders?status=${encodeURIComponent(status)}`);
}

export type OrderItemDetail = { product_id: string; name: string; quantity: number; note: string | null; price_at_order: number };
export type OrderDetail = {
  id: string; unique_code: string; total_amount: number; paid_amount: number | null; parent_code: string | null; status: string; mode: string;
  scheduled_at: string | null; delivery_method: string; delivery_address: string | null;
  delivery_lat: string | null; delivery_lng: string | null; created_at: string; items: OrderItemDetail[];
};

export function adminOrderDetail(code: string): Promise<OrderDetail> {
  return apiGet<OrderDetail>(`/admin/orders/${encodeURIComponent(code)}`);
}

export function adminAdvanceOrder(code: string): Promise<{ status: string }> {
  return adminMutate<{ status: string }>(`/admin/orders/${encodeURIComponent(code)}/advance`, "POST");
}

export function adminMarkPaid(code: string, paidAmount: number): Promise<{ paid: boolean; changed: boolean; status: string | null }> {
  return adminMutate<{ paid: boolean; changed: boolean; status: string | null }>(`/admin/orders/${encodeURIComponent(code)}/mark-paid`, "POST", { paid_amount: paidAmount });
}

export function adminSettleParent(code: string): Promise<{ status: string }> {
  return adminMutate<{ status: string }>(`/admin/orders/${encodeURIComponent(code)}/settle-parent`, "POST");
}

export type Post = { id: string; title: string; body: string; tag: string; product_id: string | null; image_url: string | null; product_ids: string[]; created_at: string };

export function getPosts(): Promise<Post[]> {
  return apiGet<Post[]>("/posts");
}

export type PostDetail = Post & { products: Array<{ id: string; name: string; price: number; image_url: string | null }> };

export function getPost(id: string): Promise<PostDetail> {
  return apiGet<PostDetail>(`/posts/${encodeURIComponent(id)}`);
}

export function adminCreatePost(input: { title: string; body: string; tag: string; product_id?: string | null; image_url?: string | null; product_ids?: string[] }): Promise<{ id: string }> {
  return adminMutate<{ id: string }>("/admin/posts", "POST", input);
}

// --- QRIS (public cart flow) ---

export type ThanksData = { unique_code: string; nominal: number; paid_amount: number | null; donation_consent: boolean; qr_url: string | null; status: string };

export function generateCode(donationConsent = false): Promise<{ order_id: string; unique_code: string; qr_url: string; nominal: number }> {
  return apiPost<{ order_id: string; unique_code: string; qr_url: string; nominal: number }>("/orders/generate-code", { donation_consent: donationConsent });
}

export function getThanks(ref: string): Promise<ThanksData> {
  return apiGet<ThanksData>(`/thanks?ref=${encodeURIComponent(ref)}`);
}

export type HistoryOrder = {
  id: string; unique_code: string; total_amount: number; paid_amount: number | null;
  status: string; parent_code: string | null; donation_consent: boolean; created_at: string;
  items: Array<{ product_id: string; name: string; quantity: number }>;
};

export function getMyOrders(status?: string): Promise<HistoryOrder[]> {
  return apiGet<HistoryOrder[]>(status === undefined ? "/orders/mine" : `/orders/mine?status=${encodeURIComponent(status)}`);
}

export function topupOrder(code: string): Promise<{ order_id: string; unique_code: string; qr_url: string; nominal: number }> {
  return apiPost<{ order_id: string; unique_code: string; qr_url: string; nominal: number }>(`/orders/${encodeURIComponent(code)}/topup`, {});
}
