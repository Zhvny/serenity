-- 013_post_excerpt_research.down.sql — DOWN: kembalikan tag SoftSelling + hapus excerpt.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_tag_check;
ALTER TABLE posts ADD CONSTRAINT posts_tag_check CHECK (tag IN ('FunFact', 'News', 'SoftSelling'));
UPDATE posts SET tag = 'News' WHERE tag = 'Research';
ALTER TABLE posts DROP COLUMN IF EXISTS excerpt;
