-- backend/migrations/seed_demo_posts.sql — DEV ONLY. Contoh post semua kemungkinan.
-- Jangan jalankan di produksi (runner menolak file seed_* di ENV=production).
-- Cara pakai (DB lokal, setelah migrate):
--   psql "$DATABASE_URL" -f backend/migrations/seed_demo_posts.sql
-- Idempoten: ON CONFLICT DO NOTHING (bisa diulang). UUID literal agar stabil.

INSERT INTO posts (id, title, body, excerpt, tag, product_id, image_url, product_ids) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Kenapa gula aren lebih ramah?', 'Gula aren punya indeks glikemik lebih rendah dibanding gula pasir sehingga energi lebih stabil. Cocok untuk pemanis dessert sehat Serenity.', 'Gula aren: energi stabil untuk dessert sehat.', 'FunFact', NULL, '/images/post_gula_aren.jpg', ARRAY['samp_001', 'samp_003']),
  ('22222222-2222-2222-2222-222222222222', 'Minum air putih sebelum makan', 'Minum segelas air putih 30 menit sebelum makan membantu mengontrol porsi makan dan menjaga hidrasi sepanjang hari.', NULL, 'FunFact', NULL, NULL, '{}'),
  ('33333333-3333-3333-3333-333333333333', 'Serenity buka pre-order weekend', 'Mulai minggu ini Serenity menerima pre-order khusus weekend. Pesan maksimal H-1, ambil sendiri atau diantar.', 'Pre-order weekend telah dibuka.', 'News', NULL, NULL, ARRAY['samp_002']),
  ('44444444-4444-4444-4444-444444444444', 'Varian baru: Puding Chia Mangga', 'Puding chia dengan mangga asli tanpa pengawet kini tersedia setiap hari selama persediaan masih ada.', NULL, 'News', NULL, '/images/post_puding.jpg', '{}'),
  ('55555555-5555-5555-5555-555555555555', 'Riset: protein bantu kenyang lebih lama', 'Penelitian menunjukkan asupan protein cukup saat sarapan membuat kenyang lebih lama dan mengurangi ngemil berlebih.', 'Protein saat sarapan menekan ngemil berlebih.', 'Research', NULL, '/images/post_protein.jpg', ARRAY['samp_004']),
  ('66666666-6666-6666-6666-666666666666', 'Riset: serat dan gula darah', 'Asupan serat larut membantu memperlambat penyerapan gula sehingga kadar gula darah lebih stabil setelah makan.', NULL, 'Research', NULL, NULL, ARRAY['samp_005'])
ON CONFLICT (id) DO NOTHING;
