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

INSERT INTO products (id, name, category_id, price, tags, image_url, source, name_en) VALUES
('samp_001', 'Salad Quinoa Ayam Grilled', 'cat_food', 45000, ARRAY['high-protein','gluten-free','low-carb'], '/images/samp_001.jpg', 'seed_dev', 'Grilled Chicken Quinoa Salad')
ON CONFLICT (id) DO NOTHING;

INSERT INTO nutrition_info (product_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g) VALUES
('samp_001', 320, 28.00, 22.00, 12.00, 6.00, 4.00)
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO product_allergens (product_id, allergen_id)
SELECT 'samp_001', id FROM allergens WHERE name IN ('kacang', 'susu', 'gluten')
ON CONFLICT DO NOTHING;

-- Produk tambahan (digabung dari seed_dev_02.sql)
INSERT INTO products (id, name, category_id, price, tags, image_url, source, name_en) VALUES
('samp_002', 'Brownie Alpukat Cokelat Hitam', 'cat_dessert', 35000, ARRAY['gluten-free','low-sugar'], '/images/samp_002.jpg', 'seed_dev', 'Dark Chocolate Avocado Brownie'),
('samp_003', 'Jus Hijau Apel Timun', 'cat_drink', 25000, ARRAY['vegan','low-calorie'], '/images/samp_003.jpg', 'seed_dev', 'Green Apple Cucumber Juice'),
('samp_004', 'Nasi Merah Ayam Kemangi', 'cat_food', 40000, ARRAY['high-protein'], '/images/samp_004.jpg', 'seed_dev', 'Red Rice with Basil Chicken'),
('samp_005', 'Puding Chia Mangga', 'cat_dessert', 30000, ARRAY['vegan','gluten-free'], '/images/samp_005.jpg', 'seed_dev', 'Mango Chia Pudding')
ON CONFLICT (id) DO NOTHING;

INSERT INTO nutrition_info (product_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g) VALUES
('samp_002', 280, 6.00, 30.00, 14.00, 5.00, 12.00),
('samp_003', 120, 2.00, 28.00, 1.00, 4.00, 20.00),
('samp_004', 450, 30.00, 55.00, 10.00, 7.00, 3.00),
('samp_005', 200, 5.00, 32.00, 8.00, 9.00, 18.00)
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO product_allergens (product_id, allergen_id)
SELECT 'samp_002', id FROM allergens WHERE name IN ('telur')
ON CONFLICT DO NOTHING;

-- Produk Riil Serenity
INSERT INTO products (id, name, category_id, price, tags, image_url, source, name_en, description, description_en, is_active) VALUES
('prod_pb_bar', 'Peanut Butter Chocolate Bar', 'cat_dessert', 18000, ARRAY['high-protein','gluten-free','vegan'], '/images/peanut-chocolate-bar.jpg', 'admin', 'Peanut Butter Chocolate Bar', 'Artisan snack bar padat energi dari oat panggang, selai kacang alami, dan lelehan dark chocolate premium. Bebas gluten, tanpa pengawet.', 'Artisan energy snack bar made with roasted rolled oats, natural peanut butter, and rich dark chocolate. Gluten-free and plant-based protein.', TRUE),
('prod_roasted_milktea', 'Roasted Milk Tea (300ml)', 'cat_drink', 24000, ARRAY['low-sugar','low-calorie'], '/images/osmanthus-milktea.jpg', 'admin', 'Roasted Milk Tea (300ml)', 'Teh sangrai wangi dipadukan dengan susu segar Greenfields dan pemanis alami Stevia nol kalori. Creamy, menyegarkan, dan aman untuk gula darah.', 'Fragrant roasted tea blended with Greenfields fresh milk and zero-calorie Stevia sweetener. Creamy, refreshing, and sugar-conscious.', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO nutrition_info (product_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g) VALUES
('prod_pb_bar', 235, 7.00, 21.00, 14.00, 4.00, 9.00),
('prod_roasted_milktea', 140, 6.00, 11.00, 7.50, 0.00, 2.50)
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO product_allergens (product_id, allergen_id)
SELECT 'prod_pb_bar', id FROM allergens WHERE name = 'kacang'
ON CONFLICT DO NOTHING;

INSERT INTO product_allergens (product_id, allergen_id)
SELECT 'prod_roasted_milktea', id FROM allergens WHERE name = 'susu'
ON CONFLICT DO NOTHING;
