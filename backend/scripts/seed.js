import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

// Seed katalog (seed_dev.sql) — idempoten (ON CONFLICT DO NOTHING), aman tiap deploy.
// HANYA seed_dev.sql: seed_demo_* tidak ikut (data demo, dilarang di produksi).
const { Client } = pg;
const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
try {
  await db.query(readFileSync(join(DIR, "seed_dev.sql"), "utf8"));
  const { rows } = await db.query("SELECT (SELECT COUNT(*) FROM categories) AS c, (SELECT COUNT(*) FROM products) AS p");
  console.log(`seed ok: categories=${rows[0]?.c} products=${rows[0]?.p}`);
} finally {
  await db.end();
}
