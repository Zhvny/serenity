-- 017_product_source.sql — UP (additif): penanda asal baris produk (seed vs admin).
ALTER TABLE products ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'admin';
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_source_check;
ALTER TABLE products ADD CONSTRAINT products_source_check CHECK (source IN ('seed_dev', 'admin'));
UPDATE products SET source = 'seed_dev' WHERE id IN ('prod_001', 'prod_002', 'prod_003', 'prod_004', 'prod_005') AND source <> 'seed_dev';
