-- 024_idem_owner.sql -- UP: serahkan idempotency_keys ke serenity_migrate.
-- Latar: 021 di-apply manual via serenity_admin sehingga tabel ini satu-satunya
-- objek milik admin; akibatnya ALTER DEFAULT PRIVILEGES FOR ROLE serenity_migrate
-- tak berlaku + GRANT/ALTER oleh role migrate ditolak (lihat 022).
-- CATATAN: sekali ini dijalankan sebagai pemilik lama (admin/superuser);
-- setelahnya semua objek milik migrate dan default privileges jalan normal.
ALTER TABLE IF EXISTS idempotency_keys OWNER TO serenity_migrate;
