import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createPool } from "../src/db/pool.js";

// Kenari kelas-bug 022: test lain jalan sebagai superuser sehingga buta
// terhadap permission-denied role runtime. File ini mengunci invarian:
// serenity_app punya DML penuh di semua tabel aplikasi + default privileges
// serenity_migrate -> app ada (agar tabel BARU otomatis ikut).
// Hanya schema_migrations (bookkeeping internal) dikecualikan.
const pool = createPool();
after(async () => { await pool.end(); });

describe("least-privilege grants", () => {
  it("serenity_app: SELECT/INSERT/UPDATE/DELETE di semua tabel aplikasi", async () => {
    const { rows } = await pool.query<{ table_name: string; privs: string }>(
      `SELECT t.table_name, COALESCE(string_agg(g.privilege_type, ',' ORDER BY g.privilege_type), '') AS privs
       FROM information_schema.tables t
       LEFT JOIN information_schema.role_table_grants g
         ON g.table_name = t.table_name AND g.grantee = 'serenity_app'
       WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
         AND t.table_name <> 'schema_migrations'
       GROUP BY t.table_name ORDER BY t.table_name`,
    );
    assert.ok(rows.length > 10, `tabel terlalu sedikit: ${rows.length}`);
    const need = ["SELECT", "INSERT", "UPDATE", "DELETE"];
    for (const r of rows) {
      const have = r.privs.split(",").filter((s) => s !== "");
      for (const p of need) assert.ok(have.includes(p), `${r.table_name} kurang ${p} (ada: ${r.privs || "nihil"})`);
    }
  });

  it("default privileges serenity_migrate -> app terdaftar", async () => {
    const { rows } = await pool.query<{ n: string }>(
      "SELECT count(*) AS n FROM pg_default_acl WHERE defaclrole = 'serenity_migrate'::regrole",
    );
    assert.ok(Number(rows[0]?.n) >= 1, "ALTER DEFAULT PRIVILEGES untuk migrate hilang");
  });
});
