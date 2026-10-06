-- 019_post_body_en_check.sql — UP: samakan batas body_en dengan body id (≤2000) +
-- backfill description_en produk yang punya deskripsi id.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_body_en_check;
ALTER TABLE posts ADD CONSTRAINT posts_body_en_check CHECK (body_en IS NULL OR char_length(body_en) <= 2000);
UPDATE products SET description_en = CASE id
  WHEN 'samp_007' THEN 'Sugar-free jasmine tea, allergen-free.'
  WHEN 'samp_008' THEN 'Whole-wheat bread with no nutrition row (LEFT JOIN test).'
  ELSE description_en END
WHERE id IN ('samp_007', 'samp_008') AND description_en IS NULL;
