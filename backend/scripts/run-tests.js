import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

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
