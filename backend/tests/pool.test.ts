import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPool } from "../src/db/pool.js";

describe("createPool TLS", () => {
  it("sslmode=require -> rejectUnauthorized true (anti MITM)", async () => {
    const prev = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://u:p@host:5432/db?sslmode=require";
    try {
      const pool = createPool();
      const ssl = (pool as unknown as { options: { ssl: { rejectUnauthorized: boolean } } }).options.ssl;
      assert.equal(ssl.rejectUnauthorized, true);
      await pool.end();
    } finally {
      if (prev === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = prev;
    }
  });
  it("sslmode=disable (dev lokal) -> tanpa ssl", async () => {
    const prev = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgres://u:p@localhost:5432/db?sslmode=disable";
    try {
      const pool = createPool();
      const ssl = (pool as unknown as { options: { ssl: unknown } }).options.ssl;
      assert.equal(ssl, undefined);
      await pool.end();
    } finally {
      if (prev === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = prev;
    }
  });
});
