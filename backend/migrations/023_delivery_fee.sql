-- 023_delivery_fee.sql -- UP (additif): ongkir tunai per order (opsi B).
-- Admin input manual setelah cek aplikasi kurir; dibayar tunai, tercatat info.
-- Nominal QRIS tak tersentuh (total_amount tetap nominal makanan).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee INTEGER CHECK (delivery_fee IS NULL OR delivery_fee >= 0);
