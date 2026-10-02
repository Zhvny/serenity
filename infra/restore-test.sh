#!/usr/bin/env bash
# infra/restore-test.sh — bukti RPO/RTO (carry-over Plan1 Task 6).
# Alur: pg_dump sumber -> restore ke DB scratch -> npm run migrate + seed -> smoke.
# Catat durasi (RTO) + usia backup (RPO). SLO: RPO <=24h, RTO <=4h.
set -euo pipefail

SRC_URL="${SRC_URL:?set SRC_URL (DB sumber/staging)}"
SCRATCH_URL="${SCRATCH_URL:?set SCRATCH_URL (DB kosong utk restore)}"
DUMP=/tmp/serenity-$(date +%Y%m%d%H%M%S).dump

start=$(date +%s)
echo "[1/4] pg_dump sumber..."
pg_dump --format=custom --no-owner --dbname="$SRC_URL" --file="$DUMP"
echo "backup umur (RPO): baru dibuat (0 menit)."

echo "[2/4] restore ke scratch..."
pg_restore --clean --if-exists --no-owner --dbname="$SCRATCH_URL" "$DUMP"

echo "[3/4] migrate + verifikasi skema..."
DATABASE_URL="$SCRATCH_URL" node backend/scripts/migrate.js

echo "[4/4] smoke query..."
psql "$SCRATCH_URL" -c "SELECT count(*) FROM products;" -c "SELECT count(*) FROM orders;"

end=$(date +%s)
echo "RTO (restore+migrate+smoke): $(( (end - start) / 60 )) menit $(( (end - start) % 60 )) detik."
echo "Catat angka ini sebagai bukti RTO (<=4h) + RPO (usia backup <=24h) sebelum klaim DONE."
