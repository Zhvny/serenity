-- 031_payment_queue_grant.down.sql -- DOWN
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE payment_queue_seq FROM serenity_app, serenity_migrate;
