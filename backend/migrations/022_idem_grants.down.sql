-- 022_idem_grants.down.sql -- DOWN: cabut DML 022.
REVOKE ALL ON TABLE idempotency_keys FROM serenity_app, serenity_migrate;
