-- 009_order_fulfilment_status.down.sql — DOWN: kembalikan ke set status 004.
-- (Order ber-status preparing/done harus ditangani manual sebelum down di produksi.)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'pending_payment','processing','ready','delivered','completed','cancelled','paid','expired'
));
