-- 006_admin_sessions.sql — UP (additif): session admin + lockout + index FK
CREATE TABLE IF NOT EXISTS admin_sessions (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  exp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_exp ON admin_sessions(exp);

CREATE TABLE IF NOT EXISTS login_attempts (
  username VARCHAR(100) PRIMARY KEY,
  n INTEGER NOT NULL DEFAULT 0,
  until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index FK yang hilang (join nutrition/allergen per produk di listAll):
CREATE INDEX IF NOT EXISTS idx_nutrition_info_product ON nutrition_info(product_id);
CREATE INDEX IF NOT EXISTS idx_product_allergens_allergen ON product_allergens(allergen_id);
