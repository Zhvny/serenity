-- 008_delivery_coords.sql — UP (additif): koordinat pengiriman pada orders.
-- PII LOKASI: delivery_lat/delivery_lng diisi dari map (Leaflet+OSM) saat metode "delivery".
-- Nullable (pickup/instant tak punya koordinat). numeric(9,6) ~ presisi ~0.11m, cukup untuk alamat.
-- Perlakuan PII: tulis-saja (tidak dikembalikan di GET publik), ikut retensi/hapus seperti delivery_address.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat numeric(9,6);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng numeric(9,6);
