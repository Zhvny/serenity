-- 003_ipaymu.sql — DICABUT (no-op). iPaymu ditarik total (lihat spec QRIS +
-- Plan1 Keputusan Eksekusi #1B). Perubahan kolom destruktif pada versi lama
-- dihapus karena bertentangan dengan pola additif-only Plan1.
-- Kolom pembayaran QRIS dibuat terpisah di Plan5. File dipertahankan sebagai
-- no-op agar urutan nomor migrasi & schema_migrations tetap konsisten.
SELECT 1;
