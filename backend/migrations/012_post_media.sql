-- 012_post_media.sql — UP (additif): media + produk saran untuk posts.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS product_ids VARCHAR(50)[] NOT NULL DEFAULT '{}';
