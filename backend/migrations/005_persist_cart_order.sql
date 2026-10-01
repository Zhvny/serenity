-- 005_persist_cart_order.sql — UP (additif): persistensi cart + sequence order-id harian
CREATE TABLE IF NOT EXISTS carts (
  id VARCHAR(50) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  item_id VARCHAR(50) PRIMARY KEY,
  cart_id VARCHAR(50) NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id VARCHAR(50);

-- Sequence order-id per hari: atomik & aman multi-instance (ON CONFLICT bump).
CREATE TABLE IF NOT EXISTS order_seq (
  day DATE PRIMARY KEY,
  n INTEGER NOT NULL DEFAULT 0
);
