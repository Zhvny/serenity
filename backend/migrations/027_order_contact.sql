-- 027_order_contact.sql -- UP (additif): nama & nomor WhatsApp pemesan pada order.
-- Pembayaran kini transfer bank manual: admin perlu mencocokkan transfer dengan pesanan dan bisa
-- menghubungi pemesan. Nullable: order lama tetap valid.
-- PII: nama tampil di daftar admin (untuk mencocokkan nama pengirim transfer); nomor HP hanya di detail admin,
-- tidak pernah dikembalikan ke endpoint publik (/thanks, /orders/mine).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(80);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
