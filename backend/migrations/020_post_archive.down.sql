-- 020_post_archive.down.sql — DOWN.
DROP INDEX IF EXISTS idx_posts_active_created;
ALTER TABLE posts DROP COLUMN IF EXISTS deleted_at;
