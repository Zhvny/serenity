-- 027_order_contact.down.sql -- DOWN
ALTER TABLE orders DROP COLUMN IF EXISTS customer_phone;
ALTER TABLE orders DROP COLUMN IF EXISTS customer_name;
