-- 018_sample_ids.down.sql — DOWN: kembalikan samp_00N -> prod_00N (pola sama).
DO $$
DECLARE
  pair TEXT[];
  pairs TEXT[][] := ARRAY[['samp_001','prod_001'],['samp_002','prod_002'],['samp_003','prod_003'],['samp_004','prod_004'],['samp_005','prod_005'],['samp_006','prod_006'],['samp_007','prod_007'],['samp_008','prod_008']];
BEGIN
  FOREACH pair SLICE 1 IN ARRAY pairs LOOP
    IF EXISTS (SELECT 1 FROM products WHERE id = pair[1]) AND NOT EXISTS (SELECT 1 FROM products WHERE id = pair[2]) THEN
      INSERT INTO products (id, name, category_id, price, tags, image_url, description, name_en, description_en, source, is_active, created_at, updated_at)
        SELECT pair[2], name, category_id, price, tags, image_url, description, name_en, description_en, source, is_active, created_at, updated_at FROM products WHERE id = pair[1];
      UPDATE nutrition_info SET product_id = pair[2] WHERE product_id = pair[1];
      UPDATE product_allergens SET product_id = pair[2] WHERE product_id = pair[1];
      UPDATE order_items SET product_id = pair[2] WHERE product_id = pair[1];
      UPDATE cart_items SET product_id = pair[2] WHERE product_id = pair[1];
      UPDATE posts SET product_id = pair[2] WHERE product_id = pair[1];
      UPDATE posts SET product_ids = ARRAY_REPLACE(product_ids, pair[1], pair[2]) WHERE pair[1] = ANY (product_ids);
      DELETE FROM products WHERE id = pair[1];
    END IF;
  END LOOP;
END $$;
