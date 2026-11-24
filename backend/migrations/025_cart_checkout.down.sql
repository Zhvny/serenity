-- 025_cart_checkout.down.sql -- DOWN
ALTER TABLE carts DROP COLUMN IF EXISTS checkout_choice;
