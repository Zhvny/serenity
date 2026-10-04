-- backend/migrations/seed_demo_products.sql — DEV ONLY. Produk contoh semua kemungkinan.
-- Jangan jalankan di produksi (runner menolak file seed_* di ENV=production).
-- Cara pakai (DB lokal, setelah migrate + seed_dev.sql):
--   psql "$DATABASE_URL" -f backend/migrations/seed_demo_products.sql
-- Idempoten: ON CONFLICT DO NOTHING (bisa diulang).
-- Melengkapi prod_001–005: nonaktif, tanpa gambar, tanpa nutrisi, bebas alergen.

INSERT INTO products (id, name, category_id, price, tags, image_url, description, is_active) VALUES
  ('prod_006', 'Kue Contoh Nonaktif', 'cat_dessert', 20000, ARRAY['contoh'], '/images/prod_006.jpg', 'Produk contoh nonaktif untuk uji filter menu dan tombol Aktifkan di admin.', FALSE),
  ('prod_007', 'Teh Tawar Melati', 'cat_drink', 10000, ARRAY['vegan', 'low-calorie'], NULL, 'Teh melati tanpa gula, tanpa alergen.', TRUE),
  ('prod_008', 'Roti Gandum Klasik', 'cat_food', 15000, ARRAY['high-fiber'], '/images/prod_008.jpg', 'Roti gandum tanpa baris nutrisi (uji LEFT JOIN).', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO nutrition_info (product_id, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g) VALUES
  ('prod_006', 350, 4.00, 50.00, 15.00, 2.00, 25.00),
  ('prod_007', 5, 0.00, 1.00, 0.00, 0.00, 0.00)
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO product_allergens (product_id, allergen_id)
SELECT 'prod_006', id FROM allergens WHERE name IN ('gluten', 'telur')
ON CONFLICT DO NOTHING;
