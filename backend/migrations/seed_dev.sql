-- seed_dev.sql — data awal dev (verbatim DATABASE.md §2 + §6)
-- Jalankan SETELAH 001_init_schema.sql

INSERT INTO categories (id, name, description) VALUES
('cat_food', 'Makanan Sehat', 'Menu utama sehat dengan nutrisi seimbang'),
('cat_dessert', 'Dessert Sehat', 'Dessert dengan bahan sehat dan rendah gula'),
('cat_drink', 'Minuman Sehat', 'Minuman sehat dan menyegarkan')
ON CONFLICT (id) DO NOTHING;

INSERT INTO allergens (name) VALUES
('kacang'), ('susu'), ('gluten'), ('telur'), ('seafood'), ('kedelai')
ON CONFLICT (name) DO NOTHING;

INSERT INTO products (id, name, category_id, price, tags, image_url) VALUES
('prod_001', 'Salad Quinoa Ayam Grilled', 'cat_food', 45000, ARRAY['high-protein','gluten-free','low-carb'], '/images/prod_001.jpg')
ON CONFLICT (id) DO NOTHING;

INSERT INTO nutrition_info (product_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g) VALUES
('prod_001', 320, 28.00, 22.00, 12.00, 6.00, 4.00)
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO product_allergens (product_id, allergen_id)
SELECT 'prod_001', id FROM allergens WHERE name IN ('kacang', 'susu', 'gluten')
ON CONFLICT DO NOTHING;
