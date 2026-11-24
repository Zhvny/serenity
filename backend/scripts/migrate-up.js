#!/usr/bin/env node
if (process.env.DB_MIGRATE_URL) {
  process.env.DATABASE_URL = process.env.DB_MIGRATE_URL;
}
const m = await import("./migrate.js");
await m.up();
