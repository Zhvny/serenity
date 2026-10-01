import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync } from "node:fs";
import { parseDotenv, loadDotenvOverride } from "../src/env.js";

describe("env — parseDotenv", () => {
  it("parse KEY=VALUE, abaikan komentar + baris kosong, buang kutip", () => {
    const out = parseDotenv([
      "# komentar",
      "",
      "DATABASE_URL=postgres://u:p@localhost:5432/serenity?sslmode=disable",
      'ADMIN_USER="admin"',
      "PORT=3000",
      "  SPACED = value ",
    ].join("\n"));
    assert.equal(out.DATABASE_URL, "postgres://u:p@localhost:5432/serenity?sslmode=disable");
    assert.equal(out.ADMIN_USER, "admin");
    assert.equal(out.PORT, "3000");
    assert.equal(out.SPACED, "value");
    assert.equal(Object.keys(out).length, 4);
  });

  it("value boleh mengandung '=' (mis. hash salt:hex)", () => {
    const out = parseDotenv("ADMIN_PASS_HASH=salt:aa=bb");
    assert.equal(out.ADMIN_PASS_HASH, "salt:aa=bb");
  });
});

describe("env — loadDotenvOverride", () => {
  it("MEMAKSA menang atas env ambient yang sudah ada", () => {
    const env: NodeJS.ProcessEnv = { DATABASE_URL: "postgres://x@localhost/delta" };
    // Tulis sementara file .env lalu muat.
    const tmp = new URL(`./_env-${Date.now()}.tmp`, import.meta.url);
    writeFileSync(tmp, "DATABASE_URL=postgres://x@localhost/serenity\nREDIS_URL=redis://localhost:6379\n");
    try {
      loadDotenvOverride(tmp, env);
      assert.equal(env.DATABASE_URL, "postgres://x@localhost/serenity", "ambient harus dikalahkan .env");
      assert.equal(env.REDIS_URL, "redis://localhost:6379");
    } finally {
      unlinkSync(tmp);
    }
  });

  it("file .env tak ada -> no-op (env tak berubah)", () => {
    const env: NodeJS.ProcessEnv = { DATABASE_URL: "keep" };
    loadDotenvOverride(new URL("./_tidak-ada.env", import.meta.url), env);
    assert.equal(env.DATABASE_URL, "keep");
  });
});
