-- 002_delivery.sql — UP: tambah delivery_method + delivery_address ke orders
ALTER TABLE orders ADD COLUMN delivery_method VARCHAR(20) NOT NULL DEFAULT 'pickup' CHECK (delivery_method IN ('pickup', 'delivery'));
ALTER TABLE orders ADD COLUMN delivery_address VARCHAR(500);
