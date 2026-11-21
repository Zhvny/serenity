-- 026_real_menu_catalog.sql -- UP: masukkan produk riil Serenity (PB Chocolate Bar & Roasted Milk Tea) dan nonaktifkan produk sampel dev
INSERT INTO products (id, name, category_id, price, tags, image_url, source, name_en, description, description_en, is_active)
VALUES
('prod_pb_bar', 'Peanut Butter Chocolate Bar', 'cat_dessert', 18000, ARRAY['high-protein','gluten-free','vegan'], '/images/peanut-chocolate-bar.jpg', 'admin', 'Peanut Butter Chocolate Bar', 'Artisan snack bar padat energi dari oat panggang, selai kacang alami, dan lelehan dark chocolate premium. Bebas gluten, tanpa pengawet.', 'Artisan energy snack bar made with roasted rolled oats, natural peanut butter, and rich dark chocolate. Gluten-free and plant-based protein.', TRUE),
('prod_roasted_milktea', 'Roasted Milk Tea (300ml)', 'cat_drink', 24000, ARRAY['low-sugar','low-calorie'], '/images/osmanthus-milktea.jpg', 'admin', 'Roasted Milk Tea (300ml)', 'Teh sangrai wangi dipadukan dengan susu segar Greenfields dan pemanis alami Stevia nol kalori. Creamy, menyegarkan, dan aman untuk gula darah.', 'Fragrant roasted tea blended with Greenfields fresh milk and zero-calorie Stevia sweetener. Creamy, refreshing, and sugar-conscious.', TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category_id = EXCLUDED.category_id,
  price = EXCLUDED.price,
  tags = EXCLUDED.tags,
  image_url = EXCLUDED.image_url,
  source = EXCLUDED.source,
  name_en = EXCLUDED.name_en,
  description = EXCLUDED.description,
  description_en = EXCLUDED.description_en,
  is_active = TRUE;

INSERT INTO nutrition_info (product_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g)
VALUES
('prod_pb_bar', 235, 7.00, 21.00, 14.00, 4.00, 9.00),
('prod_roasted_milktea', 140, 6.00, 11.00, 7.50, 0.00, 2.50)
ON CONFLICT (product_id) DO UPDATE SET
  calories_kcal = EXCLUDED.calories_kcal,
  protein_g = EXCLUDED.protein_g,
  carbs_g = EXCLUDED.carbs_g,
  fat_g = EXCLUDED.fat_g,
  fiber_g = EXCLUDED.fiber_g,
  sugar_g = EXCLUDED.sugar_g;

INSERT INTO product_allergens (product_id, allergen_id)
SELECT 'prod_pb_bar', id FROM allergens WHERE name = 'kacang'
ON CONFLICT DO NOTHING;

INSERT INTO product_allergens (product_id, allergen_id)
SELECT 'prod_roasted_milktea', id FROM allergens WHERE name = 'susu'
ON CONFLICT DO NOTHING;

UPDATE products SET is_active = FALSE WHERE id IN ('samp_001', 'samp_002', 'samp_003', 'samp_004', 'samp_005');
