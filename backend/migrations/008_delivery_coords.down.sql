-- 008_delivery_coords.down.sql — DOWN: buang kolom koordinat pengiriman.
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_lng;
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_lat;
