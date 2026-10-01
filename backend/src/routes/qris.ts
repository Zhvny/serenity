import { Hono } from "hono";
import { randomBytes } from "node:crypto";
import type { Pool } from "pg";
import { getCart } from "../services/cart.js";
import { nextOrderId } from "../services/orders.js";
import { productRepo } from "../repos/products.js";

function cartIdOf(c: { req: { header: (n: string) => string | undefined } }): string | undefined {
  return c.req.header("cookie")?.match(/cart_id=([^;]+)/)?.[1];
}

function newCode(): string {
  // 128-bit crypto-random, hex uppercase.
  return `ORD-${randomBytes(16).toString("hex").toUpperCase()}`;
}

export function qrisRoutes(pool: Pool): Hono {
  const r = new Hono();
  const products = productRepo(pool);

  // Generate kode QRIS: nominal OTORITATIF server (hitung ulang dari cart sesi).
  r.post("/orders/generate-code", async (c) => {
    const cartId = cartIdOf(c);
    if (cartId === undefined) {
      return c.json({ status: "error", code: "NO_CART", message: "Keranjang tidak ditemukan" }, 400);
    }
    const items = await getCart(pool, cartId);
    if (items.length === 0) {
      return c.json({ status: "error", code: "CART_EMPTY", message: "Keranjang kosong" }, 400);
    }
    let total = 0;
    for (const it of items) {
      const p = await products.getById(it.product_id);
      if (p === null) {
        return c.json({ status: "error", code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan" }, 404);
      }
      total += p.price * it.quantity;
    }
    if (total <= 0) {
      return c.json({ status: "error", code: "INVALID_AMOUNT", message: "Nominal tidak valid" }, 400);
    }
    const qrBase = process.env.QUASI_STATIC_QR_URL ?? "";
    const orderId = await nextOrderId(pool);
    // unique_code crypto + retry bila bentrok UNIQUE (sangat jarang untuk 128-bit).
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = newCode();
      const qrUrl = `${qrBase}?ref=${code}`;
      try {
        await pool.query(
          "INSERT INTO orders (id, mode, total_amount, status, delivery_method, session_id, unique_code, qr_url) VALUES ($1, 'instant', $2, 'pending_payment', 'pickup', $3, $4, $5)",
          [orderId, total, cartId, code, qrUrl],
        );
        return c.json({ status: "success", data: { order_id: orderId, unique_code: code, qr_url: qrUrl, nominal: total } });
      } catch (e) {
        // Konflik unique_code -> coba kode baru; error lain -> lempar ke onError.
        if (e instanceof Error && /unique/i.test(e.message)) continue;
        throw e;
      }
    }
    return c.json({ status: "error", code: "CODE_COLLISION", message: "Gagal membuat kode" }, 500);
  });

  // Thanks terikat sesi (ADR-0001): hanya pemilik cart_id; sesi lain -> 404 seragam.
  r.get("/thanks", async (c) => {
    const ref = c.req.query("ref");
    const cartId = cartIdOf(c);
    if (ref === undefined || ref === "" || cartId === undefined) {
      return c.json({ status: "error", code: "NOT_FOUND", message: "Tidak ditemukan" }, 404);
    }
    const { rows } = await pool.query<{ unique_code: string; total_amount: number; qr_url: string | null; status: string; session_id: string | null }>(
      "SELECT unique_code, total_amount, qr_url, status, session_id FROM orders WHERE unique_code = $1",
      [ref],
    );
    const order = rows[0];
    if (order === undefined || order.session_id !== cartId) {
      // 404 seragam agar tak membocorkan eksistensi order milik sesi lain.
      return c.json({ status: "error", code: "NOT_FOUND", message: "Tidak ditemukan" }, 404);
    }
    // Hanya kode + nominal + QR + status. Tanpa alamat/nama.
    return c.json({ status: "success", data: { unique_code: order.unique_code, nominal: order.total_amount, qr_url: order.qr_url, status: order.status } });
  });

  return r;
}
