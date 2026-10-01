import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { closeRedis } from "../src/db/redis.js";
import type { Pool } from "pg";

const pool = { query: async () => ({ rows: [] }) } as unknown as Pool;

after(async () => { await closeRedis(); });

describe("cors credentials (cookie sesi cross-origin)", () => {
  it("GET dengan Origin dev → access-control-allow-credentials: true", async () => {
    const res = await createApp(pool).request("/api/v1/health", { headers: { origin: "http://localhost:5173" } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("access-control-allow-credentials"), "true");
    assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
  });
});
