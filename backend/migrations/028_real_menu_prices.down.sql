-- 028_real_menu_prices.down.sql -- DOWN
UPDATE products SET price = 18000 WHERE id = 'prod_pb_bar';
UPDATE products SET price = 15000 WHERE id = 'prod_roasted_milktea';
UPDATE products SET is_active = TRUE WHERE id LIKE 'samp_%';
