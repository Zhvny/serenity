import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { Redis } from "ioredis";

// Bersihkan counter rate-limit (rl:*) sekali di awal suite agar run berulang
// dalam 60s tak terbawa sisa (TTL window). Toleran bila Redis mati.
async function flushRateLimit() {
  // retryStrategy null: jangan reconnect tanpa batas -> gagal cepat saat Redis mati.
  // Race timeout: jaring bila connect() menggantung alih-alih menolak cepat.
  const r = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false,
    retryStrategy: () => null,
  });
  r.on("error", () => {});
  try {
    const connect = r.connect().catch(() => {}); // gagal konek bukan error fatal
    await Promise.race([connect, new Promise((res) => setTimeout(res, 1500))]);
    const keys = await r.keys("rl:*");
    if (keys.length > 0) await r.del(...keys);
  } catch { /* redis mati -> abaikan */ }
  try { r.disconnect(); } catch { /* noop */ } // immediate: tak tunggu reconnect timer
}

await flushRateLimit();

// Jalankan tiap file test di PROSES terpisah agar singleton Redis (getRedis/closeRedis)
// terisolasi per file — mencegah satu file menutup koneksi yang dipakai file lain.
const testsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "tests");
const files = readdirSync(testsDir).filter((f) => f.endsWith(".test.ts") || f.endsWith(".test.js")).sort();

let failed = 0;
for (const f of files) {
  const res = spawnSync(process.execPath, ["--import", "tsx", "--test", join("tests", f)], { stdio: "inherit" });
  if (res.status !== 0) failed += 1;
}

if (failed > 0) {
  console.error(`\n${failed} test file gagal`);
  process.exit(1);
}
console.log("\nSemua test file hijau");
