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

export function checkoutCart(input: { mode: "instant" | "scheduled"; scheduled_at?: string; delivery_method: DeliveryMethod; delivery_address?: string | null }): Promise<{ mode: string; delivery_method: DeliveryMethod; delivery_address: string | null; items: CartItem[] }> {
  return apiPost<{ mode: string; delivery_method: DeliveryMethod; delivery_address: string | null; items: CartItem[] }>("/cart/checkout", input);
}
