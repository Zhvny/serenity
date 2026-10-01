import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
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

export function fileChecksum(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

// Bila checksum tersimpan (non-null) berbeda dari isi file saat ini -> tolak
// (migrasi yang sudah di-apply tidak boleh diubah). Baris lama tanpa checksum
// (null) dibiarkan demi kompatibilitas mundur.
export function checkChecksum(version, stored, current) {
  if (stored != null && stored !== current) {
    throw new Error(`checksum migrasi ${version} berubah setelah di-apply; migrasi immutable`);
  }
}

// Larang menjalankan file seed di environment produksi.
export function guardSeed(filename, env) {
  if (env === "production" && /seed_/.test(filename)) {
    throw new Error(`seed '${filename}' ditolak di produksi`);
  }
}

// Larang down destruktif di produksi kecuali override eksplisit.
export function guardDown(env, override) {
  if (env === "production" && override !== "1") {
    throw new Error("down destruktif di produksi butuh PROD_ALLOW_DESTRUCTIVE=1");
  }
}

function currentEnv() {
  return process.env.ENV ?? process.env.NODE_ENV ?? "development";
}

export async function up() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query("CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(20) PRIMARY KEY, applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)");
    await db.query("ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)");
    await db.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    try {
      const files = sortMigrations(readdirSync(DIR));
      const { rows } = await db.query("SELECT version, checksum FROM schema_migrations");
      for (const f of files) {
        const version = f.split("_")[0];
        const content = readFileSync(join(DIR, f), "utf8");
        const sum = fileChecksum(content);
        const existing = rows.find((r) => r.version === version);
        if (existing !== undefined) {
          checkChecksum(version, existing.checksum, sum);
          console.log(`skip ${f}`);
          continue;
        }
        await db.query("BEGIN");
        try {
          await db.query(content);
          await db.query("INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)", [version, sum]);
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

// Jalankan down migrasi paling akhir (backup/rollback). Gated di produksi.
export async function down() {
  guardDown(currentEnv(), process.env.PROD_ALLOW_DESTRUCTIVE);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    try {
      const { rows } = await db.query("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1");
      const last = rows[0];
      if (last === undefined) { console.log("tidak ada migrasi untuk di-rollback"); return; }
      const ups = sortMigrations(readdirSync(DIR));
      const file = ups.find((f) => f.split("_")[0] === last.version);
      if (file === undefined) throw new Error(`file migrasi untuk versi ${last.version} tidak ditemukan`);
      const downFile = file.replace(/\.sql$/, ".down.sql");
      await db.query("BEGIN");
      try {
        await db.query(readFileSync(join(DIR, downFile), "utf8"));
        await db.query("DELETE FROM schema_migrations WHERE version = $1", [last.version]);
        await db.query("COMMIT");
        console.log(`rolled back ${downFile}`);
      } catch (e) {
        await db.query("ROLLBACK");
        throw e;
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
  const cmd = process.argv[2] ?? "up";
  const run = cmd === "down" ? down : up;
  run().catch((e) => { console.error(e.message); process.exit(1); });
}
