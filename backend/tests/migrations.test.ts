import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const DIR = new URL("../migrations/", import.meta.url);

describe("migrations", () => {
  it("nomor migrasi unik tanpa duplikat + tiap up punya down", () => {
    const all = readdirSync(DIR);
    const ups = all.filter((f) => /^\d+_.*\.sql$/.test(f) && !f.endsWith(".down.sql")).sort();
    const nums = ups.map((f) => f.split("_")[0]);
    assert.deepEqual(nums, [...new Set(nums)], "nomor migrasi duplikat terdeteksi");
    for (const f of ups) {
      const down = f.replace(/\.sql$/, ".down.sql");
      assert.ok(all.includes(down), `down hilang untuk ${f}: ${down}`);
    }
  });

  it("004 menerima status paid/expired + definisikan audit_logs + payment_events", () => {
    const sql = readFileSync(new URL("../migrations/004_status_audit.sql", import.meta.url), "utf8");
    assert.match(sql, /paid/);
    assert.match(sql, /expired/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS audit_logs/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS payment_events/);
  });

  it("003 iPaymu dinetralkan (tanpa RENAME destruktif)", () => {
    const raw = readFileSync(new URL("../migrations/003_ipaymu.sql", import.meta.url), "utf8");
    // Buang komentar baris (-- ...) agar hanya DDL nyata yang diperiksa.
    const ddl = raw.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
    assert.doesNotMatch(ddl, /RENAME/i, "003 masih mengandung RENAME destruktif");
  });
});
