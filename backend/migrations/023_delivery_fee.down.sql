-- 023_delivery_fee.down.sql -- DOWN: cabut kolom ongkir.
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_fee;
