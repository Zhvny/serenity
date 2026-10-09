import { Pool } from "pg";

export function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === "") {
    throw new Error("DATABASE_URL belum di-set");
  }
  // TLS wajib kecuali eksplisit sslmode=disable (dev lokal). Verifikasi rantai
  // sertifikat AKTIF (rejectUnauthorized) — root DigiCert G2 milik Azure PG ada
  // di bundle Mozilla bawaan Node; tanpa ini MITM backbone bisa baca/curi kredensial.
  const disableTls = /sslmode=disable/.test(connectionString);
  return new Pool({
    connectionString,
    ssl: disableTls ? undefined : { rejectUnauthorized: true },
    statement_timeout: 30_000,
    max: 10,
  });
}
