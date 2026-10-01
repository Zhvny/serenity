-- 004_status_audit.down.sql — DOWN (backup saja, bukan mekanisme pemulihan utama)
DROP INDEX IF EXISTS idx_payment_events_order;
DROP TABLE IF EXISTS payment_events;
DROP INDEX IF EXISTS idx_audit_logs_order;
DROP TABLE IF EXISTS audit_logs;
-- status CHECK dikembalikan hanya bila tidak ada baris paid/expired:
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
-- ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending_payment','processing','ready','delivered','completed','cancelled'));
