-- 001_init_schema.down.sql — DOWN: rollback skema awal (urutan terbalik)
-- Jalankan: psql $DATABASE_URL -f backend/migrations/001_init_schema.down.sql

DROP INDEX IF EXISTS idx_product_allergens;
DROP INDEX IF EXISTS idx_orders_scheduled_at;
DROP INDEX IF EXISTS idx_orders_status;
DROP INDEX IF EXISTS idx_products_tags;
DROP INDEX IF EXISTS idx_products_category;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS product_allergens;
DROP TABLE IF EXISTS nutrition_info;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS allergens;
DROP TABLE IF EXISTS categories;
