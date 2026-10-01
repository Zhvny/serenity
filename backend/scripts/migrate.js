import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const { Client } = pg;
const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const LOCK_KEY = 424242;

// Urutkan file UP bernomor (NNN_*.sql, bukan .down.sql, bukan seed_*).
// Tolak bila ada UP tanpa pasangan .down.sql.
export function sortMigrations(files) {
  const ups = files.filter((f) => /^\d+_.*\.sql$/.test(f) && !f.endsWith(".down.sql")).sort();
  for (const f of ups) {
    const down = f.replace(/\.sql$/, ".down.sql");
    if (!files.includes(down)) throw new Error(`up tanpa pasangan down: ${f}`);
  }
  return ups;
}

export function isApplied(rows, version) {
  return rows.some((r) => r.version === version);
}

export async function up() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query("CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(20) PRIMARY KEY, applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)");
    await db.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    try {
      const files = sortMigrations(readdirSync(DIR));
      const { rows } = await db.query("SELECT version FROM schema_migrations");
      for (const f of files) {
        const version = f.split("_")[0];
        if (isApplied(rows, version)) { console.log(`skip ${f}`); continue; }
        await db.query("BEGIN");
        try {
          await db.query(readFileSync(join(DIR, f), "utf8"));
          await db.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
          await db.query("COMMIT");
          console.log(`applied ${f}`);
        } catch (e) {
          await db.query("ROLLBACK");
          throw e;
        }
      }
    } finally {
      await db.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
    }
  } finally {
    await db.end();
  }
}

const invokedDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  up().catch((e) => { console.error(e.message); process.exit(1); });
}
