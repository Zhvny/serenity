-- infra/db-roles.sql — 2 role least-privilege (carry-over Plan1).
-- Dijalankan sekali oleh superuser saat provisioning Azure PG, SETELAH migrasi awal.
-- Role 'serenity_migrate' : punya DDL (dipakai job migrasi CI).
-- Role 'serenity_app'     : DML terbatas (dipakai runtime backend). Tanpa DDL/DROP.
--
-- Ganti <MIGRATE_PASSWORD> / <APP_PASSWORD> dari Key Vault, jangan commit nilai asli.

-- 1) Role migrasi: owner skema (DDL penuh untuk npm run migrate).
CREATE ROLE serenity_migrate LOGIN PASSWORD '<MIGRATE_PASSWORD>';
GRANT ALL PRIVILEGES ON DATABASE serenity TO serenity_migrate;
GRANT ALL ON SCHEMA public TO serenity_migrate;

-- 2) Role app: hanya DML pada tabel aplikasi (tanpa membuat/menghapus objek).
CREATE ROLE serenity_app LOGIN PASSWORD '<APP_PASSWORD>';
GRANT CONNECT ON DATABASE serenity TO serenity_app;
GRANT USAGE ON SCHEMA public TO serenity_app;
-- DML pada tabel yang ADA sekarang.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO serenity_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO serenity_app;
-- Tabel/sequence baru yang dibuat oleh role migrasi -> app otomatis dapat DML.
ALTER DEFAULT PRIVILEGES FOR ROLE serenity_migrate IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO serenity_app;
ALTER DEFAULT PRIVILEGES FOR ROLE serenity_migrate IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO serenity_app;

-- Cabut DDL berbahaya dari app secara eksplisit (pertahanan berlapis).
REVOKE CREATE ON SCHEMA public FROM serenity_app;

-- DATABASE_URL runtime  : postgres://serenity_app:<APP_PASSWORD>@<host>/serenity?sslmode=require
-- DB_MIGRATE_URL (CI)   : postgres://serenity_migrate:<MIGRATE_PASSWORD>@<host>/serenity?sslmode=require
