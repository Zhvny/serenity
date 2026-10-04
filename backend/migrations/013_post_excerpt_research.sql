-- 013_post_excerpt_research.sql — UP: ringkasan post + tag Research gantikan SoftSelling.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS excerpt VARCHAR(300);
UPDATE posts SET tag = 'News' WHERE tag = 'SoftSelling';
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_tag_check;
ALTER TABLE posts ADD CONSTRAINT posts_tag_check CHECK (tag IN ('FunFact', 'News', 'Research'));
