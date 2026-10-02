-- 009_order_fulfilment_status.sql — UP (additif): status pemenuhan pesanan.
-- Alur admin pasca-lunas: paid -> preparing -> ready -> done. 'ready' sudah ada di
-- CHECK; tambahkan 'preparing' dan 'done'. Nilai lama dipertahankan (tak menghapus).
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN (
  'pending_payment','processing','ready','delivered','completed','cancelled',
  'paid','expired','preparing','done'
));
