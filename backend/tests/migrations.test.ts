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

  it("007 orders QRIS additif: ALTER orders + unique_code + qr_url", () => {
    const sql = readFileSync(new URL("../migrations/007_orders_qris.sql", import.meta.url), "utf8");
    assert.match(sql, /ALTER TABLE orders/i);
    assert.match(sql, /unique_code/);
    assert.match(sql, /qr_url/);
    // Additif: tak boleh CREATE TABLE orders / DROP destruktif.
    const ddl = sql.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
    assert.doesNotMatch(ddl, /CREATE TABLE orders/i, "007 tak boleh create ulang orders");
    assert.doesNotMatch(ddl, /DROP TABLE/i);
  });

  it("008 koordinat pengiriman additif: ALTER orders + delivery_lat/lng numeric", () => {
    const sql = readFileSync(new URL("../migrations/008_delivery_coords.sql", import.meta.url), "utf8");
    assert.match(sql, /ALTER TABLE orders/i);
    assert.match(sql, /delivery_lat/);
    assert.match(sql, /delivery_lng/);
    assert.match(sql, /numeric/i);
    const ddl = sql.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
    assert.doesNotMatch(ddl, /DROP TABLE/i);
  });

  it("009 status pemenuhan: CHECK memuat preparing + done", () => {
    const sql = readFileSync(new URL("../migrations/009_order_fulfilment_status.sql", import.meta.url), "utf8");
    assert.match(sql, /ALTER TABLE orders/i);
    assert.match(sql, /preparing/);
    assert.match(sql, /done/);
    const ddl = sql.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
    assert.doesNotMatch(ddl, /DROP TABLE/i);
  });

  it("010 histori+topup: paid_amount + parent_code + donation_consent + underpaid", () => {
    const sql = readFileSync(new URL("../migrations/010_history_topup.sql", import.meta.url), "utf8");
    assert.match(sql, /ALTER TABLE orders/i);
    assert.match(sql, /paid_amount/);
    assert.match(sql, /parent_code/);
    assert.match(sql, /donation_consent/);
    assert.match(sql, /underpaid/);
    const ddl = sql.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
    assert.doesNotMatch(ddl, /DROP TABLE/i);
    assert.doesNotMatch(ddl, /CREATE TABLE orders/i);
  });

  it("011 posts: tabel posts + tag CHECK + product FK", () => {
    const sql = readFileSync(new URL("../migrations/011_posts.sql", import.meta.url), "utf8");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS posts/i);
    assert.match(sql, /SoftSelling/);
    assert.match(sql, /product_id/);
    const ddl = sql.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
    assert.doesNotMatch(ddl, /DROP TABLE/i);
  });

  it("012 post media: image_url + product_ids array", () => {
    const sql = readFileSync(new URL("../migrations/012_post_media.sql", import.meta.url), "utf8");
    assert.match(sql, /image_url/);
    assert.match(sql, /product_ids/);
    const ddl = sql.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
    assert.doesNotMatch(ddl, /DROP TABLE/i);
  });

  it("013 excerpt + tag Research gantikan SoftSelling", () => {
    const sql = readFileSync(new URL("../migrations/013_post_excerpt_research.sql", import.meta.url), "utf8");
    assert.match(sql, /excerpt/);
    const ddl = sql.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");
    assert.doesNotMatch(ddl, /DROP TABLE/i);
    const check = ddl.split("\n").find((l) => l.includes("posts_tag_check") && l.includes("CHECK"));
    assert.ok(check !== undefined && check.includes("Research") && !check.includes("SoftSelling"));
  });
});
