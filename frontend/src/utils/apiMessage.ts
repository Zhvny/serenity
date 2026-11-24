import { ApiError } from "../services/api.ts";
import { tNow } from "../i18n/t.ts";
import type { DictKey } from "../i18n/t.ts";

// Kode galat server -> kunci kamus, agar pesan mengikuti bahasa pengguna (bukan teks Indonesia mentah dari server).
const BY_CODE: Record<string, DictKey> = {
  RATE_LIMITED: "shop.common.rate",
  NETWORK: "shop.common.network",
  VALIDATION_ERROR: "shop.common.invalid",
  INVALID_ADDRESS: "shop.cart.err.address",
  INVALID_SCHEDULE: "shop.cart.err.date",
  INVALID_CONTACT: "shop.cart.err.phone",
  CART_EMPTY: "shop.common.cartEmpty",
  NOT_FOUND: "shop.common.notFound",
  PRODUCT_NOT_FOUND: "shop.common.notFound",
  ORDER_NOT_FOUND: "shop.common.notFound",
  POST_NOT_FOUND: "shop.common.notFound",
};

export function apiMessage(e: unknown, fallback: DictKey = "shop.common.error"): string {
  if (e instanceof ApiError) {
    const key = BY_CODE[e.code];
    return key !== undefined ? tNow(key) : e.message;
  }
  return tNow(fallback);
}
