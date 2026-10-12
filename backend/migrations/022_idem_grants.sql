-- 022_idem_grants.sql -- UP (additif): DML idempotency_keys untuk role runtime.
-- Latar: 021 di-apply ke prod via serenity_admin sehingga ALTER DEFAULT PRIVILEGES
-- FOR ROLE serenity_migrate tak jalan; serenity_app ditolak (permission denied).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE idempotency_keys TO serenity_app, serenity_migrate;
