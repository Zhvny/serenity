-- 020_post_archive.sql — UP (additif): arsip lunak post (hapus = set deleted_at).
ALTER TABLE posts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_posts_active_created ON posts(created_at DESC) WHERE deleted_at IS NULL;
