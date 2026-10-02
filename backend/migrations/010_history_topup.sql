-- 010_history_topup.sql — UP (additif): histori + topup underpaid.
-- paid_amount: nominal aktual masuk (diisi saat mark-paid). parent_code: order anak -> parent.
-- donation_consent: checkbox overpay-masuk-kas. underpaid: status baru.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_amount INTEGER CHECK (paid_amount IS NULL OR paid_amount > 0);
-- unique_code di 007 hanya partial UNIQUE INDEX (bukan constraint) -> FK butuh constraint nyata.
-- ADD CONSTRAINT tak mendukung IF NOT EXISTS: bungkus DO agar up idempoten.
DO $$ BEGIN
  ALTER TABLE orders ADD CONSTRAINT uq_orders_unique_code UNIQUE (unique_code);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS parent_code VARCHAR(64) REFERENCES orders(unique_code);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS donation_consent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'pending_payment','processing','ready','delivered','completed','cancelled',
  'paid','expired','preparing','done','underpaid'
));
CREATE INDEX IF NOT EXISTS idx_orders_parent_code ON orders(parent_code) WHERE parent_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_session_created ON orders(session_id, created_at DESC);
