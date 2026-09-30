-- 001_init_schema.sql — UP: skema awal Serenity (Healthy Pre-Order) (verbatim DATABASE.md)
-- Jalankan: psql $DATABASE_URL -f backend/migrations/001_init_schema.sql

CREATE TABLE categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE allergens (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE products (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category_id VARCHAR(50) NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  price INTEGER NOT NULL CHECK (price >= 0),
  tags VARCHAR(50)[] DEFAULT '{}',
  image_url VARCHAR(500),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE nutrition_info (
  product_id VARCHAR(50) PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  calories_kcal INTEGER NOT NULL CHECK (calories_kcal >= 0),
  protein_g DECIMAL(5,2) NOT NULL CHECK (protein_g >= 0),
  carbs_g DECIMAL(5,2) NOT NULL CHECK (carbs_g >= 0),
  fat_g DECIMAL(5,2) NOT NULL CHECK (fat_g >= 0),
  fiber_g DECIMAL(5,2) NOT NULL CHECK (fiber_g >= 0),
  sugar_g DECIMAL(5,2) NOT NULL CHECK (sugar_g >= 0),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_allergens (
  product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
  allergen_id INTEGER REFERENCES allergens(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, allergen_id)
);

CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(50),
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('instant', 'scheduled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  total_amount INTEGER NOT NULL CHECK (total_amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'processing', 'ready', 'delivered', 'completed', 'cancelled')),
  midtrans_transaction_id VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  note TEXT,
  price_at_order INTEGER NOT NULL CHECK (price_at_order >= 0)
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_tags ON products USING GIN (tags);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_scheduled_at ON orders(scheduled_at) WHERE mode = 'scheduled';
CREATE INDEX idx_product_allergens ON product_allergens(product_id, allergen_id);
