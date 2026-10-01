-- 007_orders_qris.down.sql — DOWN (backup saja)
DROP INDEX IF EXISTS idx_orders_unique_code;
ALTER TABLE orders DROP COLUMN IF EXISTS qr_url;
ALTER TABLE orders DROP COLUMN IF EXISTS unique_code;
