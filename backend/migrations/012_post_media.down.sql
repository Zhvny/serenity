-- 012_post_media.down.sql — DOWN: hapus kolom media posts (data ikut hilang).
ALTER TABLE posts DROP COLUMN IF EXISTS product_ids;
ALTER TABLE posts DROP COLUMN IF EXISTS image_url;
