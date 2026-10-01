-- 005_persist_cart_order.down.sql — DOWN (backup saja, bukan pemulihan utama)
DROP TABLE IF EXISTS order_seq;
ALTER TABLE orders DROP COLUMN IF EXISTS session_id;
DROP INDEX IF EXISTS idx_cart_items_cart;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
