import { Pool } from "pg";

export function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === "") {
    throw new Error("DATABASE_URL belum di-set");
  }
  return new Pool({ connectionString });
}
