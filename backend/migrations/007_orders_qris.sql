-- 007_orders_qris.sql — UP (additif): kolom QRIS pada orders (iPaymu dicabut).
-- unique_code: kode crypto 128-bit untuk ref pembayaran (UNIQUE); qr_url: QR quasi-statis.
-- session_id (binding ADR-0001) sudah ada dari 005; price_at_order ada di order_items (001).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unique_code VARCHAR(64);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_url TEXT;

-- UNIQUE constraint terpisah (ADD COLUMN ... UNIQUE tak idempoten); buat index unik bila belum ada.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_unique_code ON orders(unique_code) WHERE unique_code IS NOT NULL;
