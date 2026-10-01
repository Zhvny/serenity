import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createPool } from "./db/pool.js";
import { loadDotenvOverride } from "./env.js";

// Konfigurasi lokal (.env) menang atas env ambient shell (mis. DATABASE_URL proyek lain).
// Di produksi/CI file .env tidak ada -> env proses dipakai apa adanya.
loadDotenvOverride(new URL("../.env", import.meta.url));

const pool = createPool();
const port = Number(process.env.PORT ?? "3000");
if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error("PORT tidak valid");
serve({ fetch: createApp(pool).fetch, port });
console.log(`backend listen :${port}`);
