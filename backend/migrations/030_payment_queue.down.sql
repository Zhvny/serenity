-- 030_payment_queue.down.sql -- DOWN
DROP INDEX IF EXISTS uq_orders_payment_queue;
ALTER TABLE orders DROP COLUMN IF EXISTS queue_no;
ALTER TABLE orders DROP COLUMN IF EXISTS queue_date;
ALTER TABLE orders DROP COLUMN IF EXISTS paid_at;
DROP TABLE IF EXISTS payment_queue_seq;
