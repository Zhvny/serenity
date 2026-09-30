-- 003_ipaymu.sql — UP: ganti kolom midtrans_transaction_id → ipaymu_trx_id
ALTER TABLE orders RENAME COLUMN midtrans_transaction_id TO ipaymu_trx_id;
