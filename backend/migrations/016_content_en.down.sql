-- 016_content_en.down.sql — DOWN.
ALTER TABLE products DROP COLUMN IF EXISTS name_en;
ALTER TABLE products DROP COLUMN IF EXISTS description_en;
ALTER TABLE posts DROP COLUMN IF EXISTS title_en;
ALTER TABLE posts DROP COLUMN IF EXISTS body_en;
ALTER TABLE posts DROP COLUMN IF EXISTS excerpt_en;
