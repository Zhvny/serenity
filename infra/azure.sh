#!/usr/bin/env bash
# infra/azure.sh — provisioning Serenity ($20/bln). Jalankan setelah `az login`.
# Idempoten sebisa mungkin (create ... || true). SESUAIKAN variabel di bawah.
set -euo pipefail

RG=rg-serenity-prod
LOC=centralindonesia
ACR=acrserenity$RANDOM           # harus unik global
PG=pg-serenity                   # server PG Flexible
PG_ADMIN=serenity_admin
KV=kv-serenity$RANDOM            # harus unik global
CAENV=cae-serenity               # Container Apps environment
CA=serenity-be                   # Container App backend
MIGRATE_JOB=serenity-migrate      # Container Apps Job migrasi (dipakai CI: secret MIGRATE_JOB)
: "${PG_ADMIN_PASSWORD:?set PG_ADMIN_PASSWORD}"   # dari shell, jangan hardcode

az group create -n "$RG" -l "$LOC"

# PostgreSQL Flexible B1ms (~$13/bln) + TLS wajib.
az postgres flexible-server create -g "$RG" -n "$PG" -l "$LOC" \
  --tier Burstable --sku-name Standard_B1ms --storage-size 32 --version 15 \
  --admin-user "$PG_ADMIN" --admin-password "$PG_ADMIN_PASSWORD" \
  --public-access None --yes
# Buka firewall manual per IP setelahnya (jangan 0.0.0.0 di prod) — lihat DEPLOY-AZURE.md §3.
az postgres flexible-server db create -g "$RG" -s "$PG" -d serenity
# TODO manual: jalankan migrasi awal lalu infra/db-roles.sql (buat role migrasi+app).

# ACR Basic (~$5/bln).
az acr create -g "$RG" -n "$ACR" --sku Basic

# Key Vault (secret: DATABASE_URL app, DB_MIGRATE_URL, ADMIN_PASS_HASH, QUASI_STATIC_QR_URL, INTERNAL_KEY).
az keyvault create -g "$RG" -n "$KV" -l "$LOC"
# az keyvault secret set --vault-name "$KV" -n database-url --value "postgres://serenity_app:...@$PG.postgres.database.azure.com/serenity?sslmode=require"
# (ulangi utk secret lain; Container App baca via managed identity + secretref.)

# Container Apps environment + app backend (Consumption, min-replicas 0 -> idle ~ $0).
az containerapp env create -g "$RG" -n "$CAENV" -l "$LOC"
az containerapp create -g "$RG" -n "$CA" --environment "$CAENV" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --ingress external --target-port 3000 --min-replicas 0 --max-replicas 3 \
  --system-assigned
# TODO: beri CA akses Key Vault (az keyvault set-policy / RBAC) + ACR pull (az role assignment AcrPull).

# Job migrasi (sekali-jalan) — CI cukup `az containerapp job start --name $MIGRATE_JOB`.
# Pakai DB_MIGRATE_URL (role migrasi, DDL) dari Key Vault; image di-set CI saat start/update.
# az containerapp job create -g "$RG" -n "$MIGRATE_JOB" --environment "$CAENV" \
#   --trigger-type Manual --replica-timeout 600 --replica-retry-limit 1 \
#   --image "$ACR.azurecr.io/serenity-be:latest" \
#   --secrets db-url="<DB_MIGRATE_URL dari Key Vault>" \
#   --env-vars DATABASE_URL=secretref:db-url ENV=production \
#   --command "node scripts/migrate.js && node scripts/seed.js"
# seed.js hanya menjalankan seed_dev.sql (idempoten) — katalog wajib ada tiap deploy.

# PII TTL (opsional): job harian jalankan infra/pii-ttl.sql (psql) atau script node terjadwal.

# Static Web Apps Free (frontend) — dibuat via portal/CLI, token dipakai di CI (SWA_TOKEN).
# az staticwebapp create -g "$RG" -n swa-serenity -l eastasia --sku Free

# OIDC federated credential utk GitHub Actions (ganti <org>/<repo>):
# az ad app federated-credential create --id <APP_ID> --parameters '{
#   "name":"gh-serenity","issuer":"https://token.actions.githubusercontent.com",
#   "subject":"repo:<org>/<repo>:ref:refs/heads/master","audiences":["api://AzureADTokenExchange"]}'

echo "Provisioning dasar selesai. Lanjut: migrasi awal -> db-roles.sql -> isi Key Vault -> set CI secrets."
echo "CI secrets: ACR_NAME=$ACR  RG=$RG  CA_BACKEND=$CA  MIGRATE_JOB=$MIGRATE_JOB  KV=$KV"
echo "Juga set: AZURE_CLIENT_ID/TENANT_ID/SUBSCRIPTION_ID (OIDC), SWA_TOKEN, SMOKE_URL (URL backend publik)."
