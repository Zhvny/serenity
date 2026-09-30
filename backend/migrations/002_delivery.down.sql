-- 002_delivery.down.sql — DOWN: rollback kolom delivery (address dulu)
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_address;
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_method;
