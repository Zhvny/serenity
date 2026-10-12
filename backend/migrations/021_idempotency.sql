-- 021_idempotency.sql — UP (additif): kunci idempotensi untuk endpoint create.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  endpoint TEXT NOT NULL,
  key TEXT NOT NULL,
  body JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_idempotency_keys PRIMARY KEY (endpoint, key)
);
-- body NULL = masih diproses. Baris basi >24 jam di-reclaim malas per-request
-- (tanpa cron); TTL inline di service.
