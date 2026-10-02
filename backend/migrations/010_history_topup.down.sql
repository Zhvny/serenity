-- 010_history_topup.down.sql — DOWN: hapus artefak 010 (data paid_amount/parent ikut hilang).
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'pending_payment','processing','ready','delivered','completed','cancelled',
  'paid','expired','preparing','done'
));
DROP INDEX IF EXISTS idx_orders_session_created;
DROP INDEX IF EXISTS idx_orders_parent_code;
ALTER TABLE orders DROP COLUMN IF EXISTS donation_consent;
ALTER TABLE orders DROP COLUMN IF EXISTS parent_code;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS uq_orders_unique_code;
ALTER TABLE orders DROP COLUMN IF EXISTS paid_amount;
