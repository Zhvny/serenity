-- backend/migrations/seed_demo_orders.sql — DEV ONLY. Contoh order + order_items semua status.
-- Jangan jalankan di produksi (runner menolak file seed_* di ENV=production).
-- Cara pakai (DB lokal fresh, setelah migrate + seed_dev.sql):
--   psql "$DATABASE_URL" -f backend/migrations/seed_demo_orders.sql
-- Idempoten: ON CONFLICT DO NOTHING (bisa diulang).

INSERT INTO orders (id, mode, total_amount, paid_amount, status, delivery_method, session_id, unique_code, qr_url, donation_consent) VALUES
  ('HP-DEMO-0001', 'instant', 90000, NULL, 'pending_payment', 'pickup', 'demo-sess', 'ORD-DEMO-PENDING', 'https://qr.example?ref=ORD-DEMO-PENDING', FALSE),
  ('HP-DEMO-0002', 'instant', 90000, 90000, 'paid', 'pickup', 'demo-sess', 'ORD-DEMO-PAID', 'https://qr.example?ref=ORD-DEMO-PAID', TRUE),
  ('HP-DEMO-0003', 'instant', 60000, 30000, 'underpaid', 'pickup', 'demo-sess', 'ORD-DEMO-UNDER', 'https://qr.example?ref=ORD-DEMO-UNDER', FALSE),
  ('HP-DEMO-0004', 'instant', 30000, NULL, 'pending_payment', 'pickup', 'demo-sess', 'ORD-DEMO-TOPUP', 'https://qr.example?ref=ORD-DEMO-TOPUP', FALSE),
  ('HP-DEMO-0005', 'instant', 40000, NULL, 'expired', 'pickup', 'demo-sess', 'ORD-DEMO-EXPIRED', 'https://qr.example?ref=ORD-DEMO-EXPIRED', FALSE),
  ('HP-DEMO-0006', 'instant', 40000, NULL, 'cancelled', 'pickup', 'demo-sess', 'ORD-DEMO-CANCEL', 'https://qr.example?ref=ORD-DEMO-CANCEL', FALSE),
  ('HP-DEMO-0007', 'instant', 95000, 95000, 'preparing', 'delivery', 'demo-sess', 'ORD-DEMO-PREP', 'https://qr.example?ref=ORD-DEMO-PREP', FALSE),
  ('HP-DEMO-0008', 'instant', 95000, 95000, 'ready', 'delivery', 'demo-sess', 'ORD-DEMO-READY', 'https://qr.example?ref=ORD-DEMO-READY', FALSE),
  ('HP-DEMO-0009', 'instant', 70000, 70000, 'done', 'pickup', 'demo-sess', 'ORD-DEMO-DONE', 'https://qr.example?ref=ORD-DEMO-DONE', FALSE),
  ('HP-DEMO-0010', 'instant', 40000, NULL, 'failed', 'pickup', 'demo-sess', 'ORD-DEMO-FAILED', 'https://qr.example?ref=ORD-DEMO-FAILED', FALSE),
  ('HP-DEMO-0011', 'instant', 45000, 45000, 'processing', 'pickup', 'demo-sess', 'ORD-DEMO-PROC', 'https://qr.example?ref=ORD-DEMO-PROC', FALSE),
  ('HP-DEMO-0012', 'instant', 60000, 60000, 'delivered', 'delivery', 'demo-sess', 'ORD-DEMO-DELV', 'https://qr.example?ref=ORD-DEMO-DELV', FALSE),
  ('HP-DEMO-0013', 'scheduled', 60000, 60000, 'completed', 'pickup', 'demo-sess', 'ORD-DEMO-COMP', 'https://qr.example?ref=ORD-DEMO-COMP', FALSE),
  ('HP-DEMO-0014', 'instant', 50000, 60000, 'paid', 'pickup', 'demo-sess', 'ORD-DEMO-OVER', 'https://qr.example?ref=ORD-DEMO-OVER', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Anak top-up untuk ORD-DEMO-UNDER (sisa 30000, masih pending).
UPDATE orders SET parent_code = 'ORD-DEMO-UNDER' WHERE id = 'HP-DEMO-0004';

INSERT INTO order_items (order_id, product_id, quantity, note, price_at_order) VALUES
  ('HP-DEMO-0001', 'prod_001', 2, NULL, 45000),
  ('HP-DEMO-0002', 'prod_001', 2, NULL, 45000),
  ('HP-DEMO-0003', 'prod_002', 1, NULL, 35000),
  ('HP-DEMO-0003', 'prod_003', 1, NULL, 25000),
  ('HP-DEMO-0004', 'prod_005', 1, NULL, 30000),
  ('HP-DEMO-0005', 'prod_004', 1, NULL, 40000),
  ('HP-DEMO-0006', 'prod_004', 1, NULL, 40000),
  ('HP-DEMO-0007', 'prod_005', 2, NULL, 30000),
  ('HP-DEMO-0007', 'prod_002', 1, NULL, 35000),
  ('HP-DEMO-0008', 'prod_005', 2, NULL, 30000),
  ('HP-DEMO-0008', 'prod_002', 1, NULL, 35000),
  ('HP-DEMO-0009', 'prod_001', 1, NULL, 45000),
  ('HP-DEMO-0009', 'prod_003', 1, NULL, 25000),
  ('HP-DEMO-0010', 'prod_004', 1, NULL, 40000),
  ('HP-DEMO-0011', 'prod_001', 1, NULL, 45000),
  ('HP-DEMO-0012', 'prod_002', 1, NULL, 35000),
  ('HP-DEMO-0012', 'prod_003', 1, NULL, 25000),
  ('HP-DEMO-0013', 'prod_005', 2, NULL, 30000),
  ('HP-DEMO-0014', 'prod_003', 2, NULL, 25000);
-- Catatan: order_items tanpa ON CONFLICT (tak ada unique constraint yang cocok).
-- File ini jalan sekali per reset DB; untuk ulang, reset dulu (DROP SCHEMA).
