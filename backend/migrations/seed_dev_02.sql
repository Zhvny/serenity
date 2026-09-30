-- seed_dev_02.sql — data tambahan dev (verbatim pola seed_dev.sql)
-- Jalankan SETELAH seed_dev.sql

INSERT INTO products (id, name, category_id, price, tags, image_url) VALUES
('prod_002', 'Brownie Alpukat Cokelat Hitam', 'cat_dessert', 35000, ARRAY['gluten-free','low-sugar'], '/images/prod_002.jpg'),
('prod_003', 'Jus Hijau Apel Timun', 'cat_drink', 25000, ARRAY['vegan','low-calorie'], '/images/prod_003.jpg'),
('prod_004', 'Nasi Merah Ayam Kemangi', 'cat_food', 40000, ARRAY['high-protein'], '/images/prod_004.jpg'),
('prod_005', 'Puding Chia Mangga', 'cat_dessert', 30000, ARRAY['vegan','gluten-free'], '/images/prod_005.jpg')
ON CONFLICT (id) DO NOTHING;

INSERT INTO nutrition_info (product_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g) VALUES
('prod_002', 280, 6.00, 30.00, 14.00, 5.00, 12.00),
('prod_003', 120, 2.00, 28.00, 1.00, 4.00, 20.00),
('prod_004', 450, 30.00, 55.00, 10.00, 7.00, 3.00),
('prod_005', 200, 5.00, 32.00, 8.00, 9.00, 18.00)
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO product_allergens (product_id, allergen_id)
SELECT 'prod_002', id FROM allergens WHERE name IN ('telur')
ON CONFLICT DO NOTHING;
