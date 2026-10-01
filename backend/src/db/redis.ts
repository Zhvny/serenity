import { Redis } from "ioredis";

let client: Redis | null = null;

// Singleton ioredis. lazyConnect + retry terbatas supaya proses tidak
// menggantung saat Redis mati; rate-limit memilih fail-open bila unreachable.
export function getRedis(): Redis {
  if (client !== null) return client;
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    // Antre perintah selama koneksi lazy/reconnect singkat agar INCR rate-limit
    // tak hilang (drop = undercount). Fail-open tetap via retryStrategy null + catch.
    enableOfflineQueue: true,
    retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 200, 1000)),
  });
  // ponytail: swallow error event agar unhandled 'error' tak mematikan proses saat
  // Redis down; keputusan fail-open ditangani di pemanggil (tieredRateLimit).
  client.on("error", () => {});
  return client;
}

// Tutup koneksi singleton (dipakai di test agar proses bisa exit; aman dipanggil
// walau belum pernah connect).
export async function closeRedis(): Promise<void> {
  if (client === null) return;
  try { await client.quit(); } catch { /* sudah tertutup */ }
  client = null;
}
