import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sortMigrations, isApplied, fileChecksum, checkChecksum, guardSeed, guardDown } from "../scripts/migrate.js";

describe("migrate runner", () => {
  it("urutkan up bernomor, buang seed, pertahankan 003", () => {
    const files = ["004_status_audit.sql", "004_status_audit.down.sql", "001_init_schema.sql", "001_init_schema.down.sql", "002_delivery.sql", "002_delivery.down.sql", "003_ipaymu.sql", "003_ipaymu.down.sql", "seed_dev.sql"];
    assert.deepEqual(sortMigrations(files), ["001_init_schema.sql", "002_delivery.sql", "003_ipaymu.sql", "004_status_audit.sql"]);
  });
  it("deteksi versi applied", () => {
    assert.equal(isApplied([{ version: "001" }], "001"), true);
    assert.equal(isApplied([{ version: "001" }], "004"), false);
  });
  it("tolak up tanpa pasangan down", () => {
    assert.throws(() => sortMigrations(["004_status_audit.sql"]), /pasangan/);
  });
});

describe("migrate hardening", () => {
  it("checksum: sama -> ok, berubah -> throw", () => {
    const sum = fileChecksum("ALTER TABLE x ADD COLUMN y INT;");
    assert.doesNotThrow(() => checkChecksum("004", sum, sum));
    assert.throws(() => checkChecksum("004", sum, fileChecksum("BERUBAH;")), /checksum/i);
    // Baris lama tanpa checksum (null) tidak diblokir (kompat mundur).
    assert.doesNotThrow(() => checkChecksum("004", null, sum));
  });
  it("seed-guard: production + seed_ -> throw; dev -> ok", () => {
    assert.throws(() => guardSeed("seed_dev.sql", "production"), /produksi|production/i);
    assert.doesNotThrow(() => guardSeed("seed_dev.sql", "development"));
    assert.doesNotThrow(() => guardSeed("004_status_audit.sql", "production"));
  });
  it("down-gate: production tanpa override -> throw; dengan override -> ok; non-prod -> ok", () => {
    assert.throws(() => guardDown("production", undefined), /PROD_ALLOW_DESTRUCTIVE/);
    assert.doesNotThrow(() => guardDown("production", "1"));
    assert.doesNotThrow(() => guardDown("development", undefined));
  });
});
