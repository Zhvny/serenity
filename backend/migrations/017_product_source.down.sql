-- 017_product_source.down.sql — DOWN.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_source_check;
ALTER TABLE products DROP COLUMN IF EXISTS source;
