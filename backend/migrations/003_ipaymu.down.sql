-- 003_ipaymu.down.sql — DOWN: kembalikan ipaymu_trx_id → midtrans_transaction_id
ALTER TABLE orders RENAME COLUMN ipaymu_trx_id TO midtrans_transaction_id;
