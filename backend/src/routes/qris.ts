import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Pool } from "pg";
import { getCart } from "../services/cart.js";
import { nextOrderId, newCode } from "../services/orders.js";
import { verifyTurnstile } from "../services/turnstile.js";
import { claimIdem, completeIdem, idemKeyOf, releaseIdem } from "../services/idempotency.js";
import { productRepo } from "../repos/products.js";

// Anti-spam lapis-aplikasi (spec 2026-10-08): tunable tanpa migrasi.
const MAX_PENDING_PER_SESSION = 3;
const MIN_INTERVAL_MS = 30_000;
let globalThrottleTrips = 0;
// Batas global: rotasi sesi (cart_id baru per request) tetap berbagi ember ini.
// Turnstile sudah memaksa 1 solve per order; ember global menutup jendela fail-open.
// Dibaca per-request agar test bisa override via env (default 30/mnt).

import { cartIdOf, setCartCookie } from "./cart.js";

export function qrisRoutes(pool: Pool): Hono {
  const r = new Hono();
  const products = productRepo(pool);

  const generateSchema = z.object({
    donation_consent: z.boolean().optional().default(false),
    turnstile_token: z.string().min(1).max(2048),
    website: z.string().max(200).optional().default(""), // honeypot: manusia kirim "", bot naif mengisi
  });

  // Generate kode QRIS: nominal OTORITATIF server (hitung ulang dari cart sesi).
  r.post("/orders/generate-code", zValidator("json", generateSchema, (result, c) => {
    if (!result.success) return c.json({ status: "error", code: "VALIDATION_ERROR", message: "Input tidak valid" }, 400);
  }), async (c) => {
    const cartId = cartIdOf(c);
    if (cartId === undefined) {
      return c.json({ status: "error", code: "NO_CART", message: "Keranjang tidak ditemukan" }, 400);
    }
    setCartCookie(c, cartId);
    // Idempotency-Key (opsional) diklaim AWAL agar retry yang responsnya hilang
    // tetap replay 200 sama (melewati throttle/cek bisnis tanpa efek samping).
    // Semua return gagal di bawah melepas klaim agar retry mengulang bersih.
    const genKey = idemKeyOf(c.req.header("Idempotency-Key"));
    const GEN_EP = "POST /orders/generate-code";
    const fail = async (status: 400 | 403 | 404 | 409 | 429 | 500, code: string, message: string) => {
      if (genKey !== null) await releaseIdem(pool, GEN_EP, genKey);
      return c.json({ status: "error", code, message }, status);
    };
    if (genKey !== null) {
      const claim = await claimIdem(pool, GEN_EP, genKey);
      if (claim.kind === "replay") return c.json(claim.body as { status: string; data: unknown });
      if (claim.kind === "busy") return c.json({ status: "error", code: "IDEMPOTENT_RETRY", message: "Masih diproses, coba lagi" }, 409);
    }
    const body = c.req.valid("json");
    // Honeypot dulu (tanpa DB): kode sama dengan turnstile agar tanpa oracle.
    if (body.website !== "") {
      return fail(403, "TURNSTILE_FAILED", "Verifikasi gagal");
    }
    // Throttle per sesi (2 query ringan): batas pending + jeda 30 dtk.
    const pending = await pool.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM orders WHERE session_id = $1 AND status = 'pending_payment'", [cartId]);
    const last = await pool.query<{ last: Date | null }>(
      "SELECT MAX(created_at) AS last FROM orders WHERE session_id = $1", [cartId]);
    const lastMs = last.rows[0]?.last === null || last.rows[0]?.last === undefined
      ? 0 : new Date(last.rows[0].last).getTime();
    if ((pending.rows[0]?.n ?? 0) >= MAX_PENDING_PER_SESSION || Date.now() - lastMs < MIN_INTERVAL_MS) {
      return fail(429, "RATE_LIMITED", "Terlalu banyak permintaan");
    }
    const maxGlobal = Number(process.env.GENERATE_GLOBAL_PER_MIN ?? 30);
    const global = await pool.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM orders WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'");
    if ((global.rows[0]?.n ?? 0) >= maxGlobal) {
      // Visibilitas serangan borongan: tiap penolakan ember global ter-log + counter.
      globalThrottleTrips += 1;
      console.error(JSON.stringify({ event: "generate_global_throttled", n: globalThrottleTrips }));
      return fail(429, "RATE_LIMITED", "Terlalu banyak permintaan");
    }
    // Turnstile: token invalid/basi/duplikat -> tolak; CF tak terjangkau -> fail-open (ter-log di service).
    const verdict = await verifyTurnstile(body.turnstile_token, c.req.header("x-forwarded-for")?.split(",")[0]?.trim());
    if (verdict.ok === false) {
      return fail(403, "TURNSTILE_FAILED", "Verifikasi gagal");
    }
    const items = await getCart(pool, cartId);
    if (items.length === 0) {
      return fail(400, "CART_EMPTY", "Keranjang kosong");
    }
    let total = 0;
    for (const it of items) {
      const p = await products.getById(it.product_id);
      if (p === null) {
        return fail(404, "PRODUCT_NOT_FOUND", "Produk tidak ditemukan");
      }
      total += p.price * it.quantity;
    }
    if (total <= 0) {
      return fail(400, "INVALID_AMOUNT", "Nominal tidak valid");
    }
    const qrBase = process.env.QUASI_STATIC_QR_URL ?? "";
    const orderId = await nextOrderId(pool);
    const donationConsent = c.req.valid("json").donation_consent;
    // Siapkan harga per item sekali (sudah tervalidasi di loop total di atas).
    const priced: Array<{ product_id: string; quantity: number; price: number }> = [];
    for (const it of items) {
      const p = await products.getById(it.product_id);
      priced.push({ product_id: it.product_id, quantity: it.quantity, price: p === null ? 0 : p.price });
    }
    // unique_code crypto + retry bila bentrok UNIQUE (sangat jarang untuk 128-bit).
    let generated: { order_id: string; unique_code: string; qr_url: string; nominal: number } | null = null;
    try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = newCode();
      const qrUrl = `${qrBase}?ref=${code}`;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "INSERT INTO orders (id, mode, total_amount, status, delivery_method, session_id, unique_code, qr_url, donation_consent) VALUES ($1, 'instant', $2, 'pending_payment', 'pickup', $3, $4, $5, $6)",
          [orderId, total, cartId, code, qrUrl, donationConsent],
        );
        // Salin isi cart ke order_items agar detail pesanan (menu) tersimpan permanen.
        for (const it of priced) {
          await client.query(
            "INSERT INTO order_items (order_id, product_id, quantity, note, price_at_order) VALUES ($1, $2, $3, NULL, $4)",
            [orderId, it.product_id, it.quantity, it.price],
          );
        }
        // Kosongkan cart sesi agar tak dipesan ulang (atomik dalam transaksi yang sama).
        await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);
        await client.query("COMMIT");
        client.release();
        generated = { order_id: orderId, unique_code: code, qr_url: qrUrl, nominal: total };
        break;
      } catch (e) {
        await client.query("ROLLBACK");
        client.release();
        // Konflik unique_code -> coba kode baru; error lain -> lempar ke onError.
        if (e instanceof Error && /unique/i.test(e.message)) continue;
        throw e;
      }
    }
    } catch (e) {
      if (genKey !== null) await releaseIdem(pool, GEN_EP, genKey);
      throw e;
    }
    if (generated === null) {
      if (genKey !== null) await releaseIdem(pool, GEN_EP, genKey);
      return c.json({ status: "error", code: "CODE_COLLISION", message: "Gagal membuat kode" }, 500);
    }
    const genOut = { status: "success", data: generated } as const;
    if (genKey !== null) await completeIdem(pool, GEN_EP, genKey, genOut);
    return c.json(genOut);
  });

  // Thanks terikat sesi (ADR-0001): hanya pemilik cart_id; sesi lain -> 404 seragam.
  r.get("/thanks", async (c) => {
    const ref = c.req.query("ref");
    const cartId = cartIdOf(c);
    if (ref === undefined || ref === "" || cartId === undefined) {
      return c.json({ status: "error", code: "NOT_FOUND", message: "Tidak ditemukan" }, 404);
    }
    const { rows } = await pool.query<{ unique_code: string; total_amount: number; paid_amount: number | null; donation_consent: boolean; qr_url: string | null; status: string; session_id: string | null }>(
      "SELECT unique_code, total_amount, paid_amount, donation_consent, qr_url, status, session_id FROM orders WHERE unique_code = $1",
      [ref],
    );
    const order = rows[0];
    if (order === undefined || order.session_id !== cartId) {
      // 404 seragam agar tak membocorkan eksistensi order milik sesi lain.
      return c.json({ status: "error", code: "NOT_FOUND", message: "Tidak ditemukan" }, 404);
    }
    setCartCookie(c, cartId);
    // Hanya kode + nominal + QR + status + info bayar. Tanpa alamat/nama.
    return c.json({ status: "success", data: { unique_code: order.unique_code, nominal: order.total_amount, paid_amount: order.paid_amount, donation_consent: order.donation_consent, qr_url: order.qr_url, status: order.status } });
  });

  return r;
}
