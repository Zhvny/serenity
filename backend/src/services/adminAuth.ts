import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";

// Session + lockout DB-backed (migrasi 006_admin_sessions.sql).
export const SESSION_TTL = 12 * 3600_000;

// Fail-fast saat boot bila konfig admin tak valid (format salt:hexhash).
export function assertAdminConfig(): void {
  const user = process.env.ADMIN_USER ?? "";
  const [salt, hash] = (process.env.ADMIN_PASS_HASH ?? "").split(":");
  if (user === "" || salt === undefined || hash === undefined || salt === "" || !/^[0-9a-f]+$/i.test(hash)) {
    throw new Error("ADMIN_USER / ADMIN_PASS_HASH (format salt:hexhash) wajib di-set");
  }
}

export function verifyPassword(password: string): boolean {
  const [salt, hash] = (process.env.ADMIN_PASS_HASH ?? "").split(":");
  if (salt === undefined || hash === undefined || salt === "" || hash === "") return false;
  const a = scryptSync(password, salt, 64);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function isLocked(pool: Pool, username: string): Promise<boolean> {
  const { rows } = await pool.query<{ until: string }>(`SELECT until FROM login_attempts WHERE username = $1`, [username]);
  const until = rows[0]?.until;
  return until !== undefined && Date.parse(until) > Date.now();
}

export async function recordLogin(pool: Pool, username: string, ok: boolean): Promise<void> {
  if (ok) {
    await pool.query(`DELETE FROM login_attempts WHERE username = $1`, [username]);
    return;
  }
  // Naikkan counter; kunci 15 menit saat mencapai 5 kegagalan.
  await pool.query(
    `INSERT INTO login_attempts (username, n, until) VALUES ($1, 1, CURRENT_TIMESTAMP)
     ON CONFLICT (username) DO UPDATE SET n = login_attempts.n + 1,
       until = CASE WHEN login_attempts.n + 1 >= 5 THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE login_attempts.until END`,
    [username],
  );
}

export async function createSession(pool: Pool, username: string): Promise<string> {
  const id = randomUUID();
  await pool.query(`INSERT INTO admin_sessions (id, username, exp) VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '12 hours')`, [id, username]);
  return id;
}

export async function destroySession(pool: Pool, id: string): Promise<void> {
  await pool.query(`DELETE FROM admin_sessions WHERE id = $1`, [id]);
}

export async function sessionUser(pool: Pool, cookieHeader: string | undefined): Promise<string | null> {
  const id = cookieHeader?.match(/admin_session=([^;]+)/)?.[1];
  if (id === undefined) return null;
  const { rows } = await pool.query<{ username: string }>(`SELECT username FROM admin_sessions WHERE id = $1 AND exp > CURRENT_TIMESTAMP`, [id]);
  const username = rows[0]?.username;
  if (username === undefined) {
    await pool.query(`DELETE FROM admin_sessions WHERE id = $1`, [id]);
    return null;
  }
  return username;
}
