-- 011_posts.sql — UP (additif): tabel posts untuk FunFact/News/SoftSelling (admin kelola, publik baca).
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL CHECK (char_length(title) >= 1),
  body TEXT NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  tag VARCHAR(20) NOT NULL CHECK (tag IN ('FunFact', 'News', 'SoftSelling')),
  product_id VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
