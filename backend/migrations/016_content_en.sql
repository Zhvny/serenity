-- 016_content_en.sql — UP (additif): kolom Inggris konten + backfill.
ALTER TABLE products ADD COLUMN IF NOT EXISTS name_en VARCHAR(200);
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS title_en VARCHAR(200);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS body_en TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt_en VARCHAR(300);
UPDATE products SET name_en = CASE id
  WHEN 'prod_001' THEN 'Grilled Chicken Quinoa Salad'
  WHEN 'prod_002' THEN 'Dark Chocolate Avocado Brownie'
  WHEN 'prod_003' THEN 'Green Apple Cucumber Juice'
  WHEN 'prod_004' THEN 'Red Rice with Basil Chicken'
  WHEN 'prod_005' THEN 'Mango Chia Pudding'
  WHEN 'prod_006' THEN 'Sample Inactive Cake'
  WHEN 'prod_007' THEN 'Plain Jasmine Tea'
  WHEN 'prod_008' THEN 'Classic Whole-Wheat Bread'
  ELSE name_en END
WHERE name_en IS NULL;
UPDATE posts SET title_en = CASE id
  WHEN '11111111-1111-1111-1111-111111111111' THEN 'Why is palm sugar friendlier?'
  WHEN '22222222-2222-2222-2222-222222222222' THEN 'Drink water before meals'
  WHEN '33333333-3333-3333-3333-333333333333' THEN 'Serenity opens weekend pre-orders'
  WHEN '44444444-4444-4444-4444-444444444444' THEN 'New: Mango Chia Pudding'
  WHEN '55555555-5555-5555-5555-555555555555' THEN 'Research: protein keeps you full longer'
  WHEN '66666666-6666-6666-6666-666666666666' THEN 'Research: fiber and blood sugar'
  ELSE title_en END,
body_en = CASE id
  WHEN '11111111-1111-1111-1111-111111111111' THEN 'Palm sugar has a lower glycemic index than white sugar, so energy stays stable. A fit sweetener for Serenity''s healthy desserts.'
  WHEN '22222222-2222-2222-2222-222222222222' THEN 'A glass of water 30 minutes before meals helps control portions and keeps you hydrated all day.'
  WHEN '33333333-3333-3333-3333-333333333333' THEN 'Starting this week Serenity takes weekend-only pre-orders. Order by H-1 at the latest, pick up or get it delivered.'
  WHEN '44444444-4444-4444-4444-444444444444' THEN 'Chia pudding with real mango and no preservatives is now available daily while stock lasts.'
  WHEN '55555555-5555-5555-5555-555555555555' THEN 'Research shows enough protein at breakfast keeps you full longer and cuts excess snacking.'
  WHEN '66666666-6666-6666-6666-666666666666' THEN 'Soluble fiber slows sugar absorption so blood sugar stays steadier after meals.'
  ELSE body_en END,
excerpt_en = CASE id
  WHEN '11111111-1111-1111-1111-111111111111' THEN 'Palm sugar: stable energy for healthy desserts.'
  WHEN '33333333-3333-3333-3333-333333333333' THEN 'Weekend pre-orders are now open.'
  WHEN '55555555-5555-5555-5555-555555555555' THEN 'Breakfast protein curbs excess snacking.'
  ELSE excerpt_en END
WHERE title_en IS NULL;
