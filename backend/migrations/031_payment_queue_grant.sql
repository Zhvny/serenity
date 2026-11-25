-- 031_payment_queue_grant.sql -- UP: grant runtime untuk sequence antrean.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE payment_queue_seq TO serenity_app, serenity_migrate;
