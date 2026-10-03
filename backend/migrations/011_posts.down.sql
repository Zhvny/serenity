-- 011_posts.down.sql — DOWN: hapus tabel posts (data post ikut hilang).
DROP INDEX IF EXISTS idx_posts_created;
DROP TABLE IF EXISTS posts;
