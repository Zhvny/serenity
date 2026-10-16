-- 024_idem_owner.down.sql -- DOWN: kembalikan ke admin (jalan sebagai pemilik/superuser).
ALTER TABLE IF EXISTS idempotency_keys OWNER TO serenity_admin;
