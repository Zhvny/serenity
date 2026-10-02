-- infra/pii-ttl.sql — Retensi PII (carry-over): hapus alamat + koordinat pengiriman
-- pada order yang sudah > 30 hari. Idempoten; dijalankan terjadwal (cron/Container Apps Job harian).
-- Hanya mengosongkan PII; baris order (untuk audit/akuntansi) tetap ada.
UPDATE orders
SET delivery_address = NULL,
    delivery_lat = NULL,
    delivery_lng = NULL,
    updated_at = CURRENT_TIMESTAMP
WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND (delivery_address IS NOT NULL OR delivery_lat IS NOT NULL OR delivery_lng IS NOT NULL);
