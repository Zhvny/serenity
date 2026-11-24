-- 026_real_menu_catalog.down.sql -- DOWN
UPDATE products SET is_active = TRUE WHERE id IN ('samp_001', 'samp_002', 'samp_003', 'samp_004', 'samp_005');
DELETE FROM product_allergens WHERE product_id IN ('prod_pb_bar', 'prod_roasted_milktea');
DELETE FROM nutrition_info WHERE product_id IN ('prod_pb_bar', 'prod_roasted_milktea');
DELETE FROM products WHERE id IN ('prod_pb_bar', 'prod_roasted_milktea');
