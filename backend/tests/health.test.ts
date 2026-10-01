import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { closeRedis } from "../src/db/redis.js";
import type { Pool } from "pg";

const pool = {} as Pool;

after(async () => { await closeRedis(); });

describe("GET /api/v1/health", () => {
  it("200 {status:success}", async () => {
    const app = createApp(pool);
    const res = await app.request("/api/v1/health");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "success", data: { ok: true } });
  });
});
