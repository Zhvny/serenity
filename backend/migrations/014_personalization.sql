-- 014_personalization.sql — UP (additif): trending views + preferensi need per session.
CREATE TABLE IF NOT EXISTS post_views (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_post_views UNIQUE (post_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_post_views_post_time ON post_views(post_id, viewed_at DESC);
CREATE TABLE IF NOT EXISTS user_preferences (
  session_id TEXT PRIMARY KEY,
  need VARCHAR(20) NOT NULL CHECK (need IN ('diet','muscle','diabetes','allergy_free','low_sugar')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
