import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import type { Pool } from "pg";

const pool = { query: async () => ({ rows: [] }) } as unknown as Pool;
const future = new Date(Date.now() + 25 * 3600 * 1000).toISOString();

describe("orders", () => {
  it("POST /orders scheduled <24 jam → 400 INVALID_SCHEDULE", async () => {
    const res = await createApp(pool).request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ product_id: "prod_001", quantity: 1 }], mode: "scheduled", scheduled_at: new Date(Date.now() + 3600 * 1000).toISOString() }) });
    assert.equal(res.status, 400);
  });
  it("POST /orders instant + scheduled_at → 400 INVALID_SCHEDULE", async () => {
    const res = await createApp(pool).request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ product_id: "prod_001", quantity: 1 }], mode: "instant", scheduled_at: future }) });
    assert.equal(res.status, 400);
  });
  it("PUT /orders/:id/status tanpa internal key → 403", async () => {
    const res = await createApp(pool).request("/api/v1/orders/HP-0001/status", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "paid" }) });
    assert.equal(res.status, 403);
  });
  it("POST /orders qty 11 → 400 VALIDATION_ERROR", async () => {
    const res = await createApp(pool).request("/api/v1/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ items: [{ product_id: "prod_001", quantity: 11 }], mode: "instant" }) });
    assert.equal(res.status, 400);
  });
});
