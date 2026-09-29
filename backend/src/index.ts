import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createPool } from "./db/pool.js";

const pool = createPool();
const port = Number(process.env.PORT ?? "3000");
if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error("PORT tidak valid");
serve({ fetch: createApp(pool).fetch, port });
console.log(`backend listen :${port}`);
