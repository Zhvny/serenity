-- 030_payment_queue.sql -- UP: antrean harian berdasarkan pembayaran berhasil.
-- Additif: order lama tetap utuh; hanya pembayaran setelah migrasi mendapat nomor.
CREATE TABLE IF NOT EXISTS payment_queue_seq (
  queue_date DATE PRIMARY KEY,
  n INTEGER NOT NULL DEFAULT 0 CHECK (n >= 0)
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS queue_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS queue_no INTEGER CHECK (queue_no IS NULL OR queue_no > 0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_payment_queue
  ON orders (queue_date, queue_no)
  WHERE queue_date IS NOT NULL AND queue_no IS NOT NULL;
