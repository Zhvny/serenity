import { Pool } from "pg";

export function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === "") {
    throw new Error("DATABASE_URL belum di-set");
  }
  // TLS wajib kecuali eksplisit sslmode=disable (dev lokal). rejectUnauthorized:false
  // agar kompatibel dengan sertifikat managed Azure PG; ketatkan bila CA dipin.
  const disableTls = /sslmode=disable/.test(connectionString);
  return new Pool({
    connectionString,
    ssl: disableTls ? undefined : { rejectUnauthorized: false },
    statement_timeout: 30_000,
    max: 10,
  });
}
