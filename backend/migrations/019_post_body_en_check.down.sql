-- 019_post_body_en_check.down.sql — DOWN.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_body_en_check;
