-- 028_real_menu_prices.sql -- UP: update harga menu riil & deaktifkan produk sampel.
UPDATE products SET price = 45000, updated_at = CURRENT_TIMESTAMP WHERE id = 'prod_pb_bar';
UPDATE products SET price = 35000, updated_at = CURRENT_TIMESTAMP WHERE id = 'prod_roasted_milktea';
UPDATE products SET is_active = FALSE WHERE id LIKE 'samp_%';
