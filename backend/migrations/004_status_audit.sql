-- 004_status_audit.sql — UP (additif saja): sinkron status runtime + tabel audit/events
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending_payment','processing','ready','delivered','completed','cancelled','paid','expired'));

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  order_id VARCHAR(50),
  detail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_order ON audit_logs(order_id);

CREATE TABLE IF NOT EXISTS payment_events (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'qris',
  external_ref VARCHAR(200),
  event_type VARCHAR(50) NOT NULL,
  payload TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider, external_ref, event_type)
);
CREATE INDEX IF NOT EXISTS idx_payment_events_order ON payment_events(order_id);
