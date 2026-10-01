import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sortMigrations, isApplied } from "../scripts/migrate.js";

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
