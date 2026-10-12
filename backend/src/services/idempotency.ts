import type { Pool } from "pg";

// Idempotency-Key untuk endpoint create (POST /orders, /orders/generate-code,
// /orders/:code/topup): retry/timeout klien tak bikin order ganda.
// Klaim via INSERT ... ON CONFLICT DO NOTHING; baris basi >24 jam di-reclaim
// atomik per-request; klaim bersamaan -> busy (409) agar klien retry.
// ponytail: tanpa cron/worker; reclaim malas cukup untuk volume warung.
const MAX_KEY_LEN = 64;

export function idemKeyOf(header: string | undefined): string | null {
  if (header === undefined) return null;
  const k = header.trim();
  if (k === "" || k.length > MAX_KEY_LEN || /[\r\n]/.test(k)) return null;
  return k;
}

export type IdemClaim =
  | { kind: "fresh" }
  | { kind: "replay"; body: unknown }
  | { kind: "busy" };

export async function claimIdem(pool: Pool, endpoint: string, key: string): Promise<IdemClaim> {
  const ins = await pool.query(
    "INSERT INTO idempotency_keys (endpoint, key) VALUES ($1, $2) ON CONFLICT (endpoint, key) DO NOTHING",
    [endpoint, key],
  );
  if ((ins.rowCount ?? 0) === 1) return { kind: "fresh" };
  // Kunci lama: reclaim bila basi (atomik, satu pemenang), lalu baca ulang.
  const rec = await pool.query(
    `UPDATE idempotency_keys SET body = NULL, created_at = CURRENT_TIMESTAMP
     WHERE endpoint = $1 AND key = $2 AND created_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'`,
    [endpoint, key],
  );
  if ((rec.rowCount ?? 0) === 1) return { kind: "fresh" };
  const cur = await pool.query<{ body: unknown }>(
    "SELECT body FROM idempotency_keys WHERE endpoint = $1 AND key = $2", [endpoint, key]);
  const row = cur.rows[0];
  if (row === undefined || row.body === null) return { kind: "busy" };
  return { kind: "replay", body: row.body };
}

export async function completeIdem(pool: Pool, endpoint: string, key: string, body: unknown): Promise<void> {
  await pool.query("UPDATE idempotency_keys SET body = $3 WHERE endpoint = $1 AND key = $2",
    [endpoint, key, JSON.stringify(body)]);
}

export async function releaseIdem(pool: Pool, endpoint: string, key: string): Promise<void> {
  await pool.query("DELETE FROM idempotency_keys WHERE endpoint = $1 AND key = $2", [endpoint, key]);
}
