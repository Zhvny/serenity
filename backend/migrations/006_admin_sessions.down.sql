-- 006_admin_sessions.down.sql — DOWN (backup saja)
DROP INDEX IF EXISTS idx_product_allergens_allergen;
DROP INDEX IF EXISTS idx_nutrition_info_product;
DROP TABLE IF EXISTS login_attempts;
DROP INDEX IF EXISTS idx_admin_sessions_exp;
DROP TABLE IF EXISTS admin_sessions;
