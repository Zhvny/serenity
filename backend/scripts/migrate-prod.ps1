# scripts/migrate-prod.ps1 - migrasi prod manual semi-otomatis (TANPA secret di GitHub).
# Alur: minta password role migrate (SecureString, tak pernah ke file/history) ->
# buka firewall sementara IP publik lokal -> node scripts/migrate.js -> tutup firewall
# (selalu, walau gagal). Idempoten: migrasi yang sudah jalan di-skip runner.
#
# Pemakaian:
#   cd backend ; ./scripts/migrate-prod.ps1
# Override opsional:
#   $env:MIGRATE_USER (default serenity_migrate), $env:PG_SERVER (default pg-serenity55727),
#   $env:PG_FQDN (default <server>.postgres.database.azure.com), $env:PG_DB (default serenity)
[CmdletBinding()]
param(
  [string]$ResourceGroup = "rg-serenity-prod",
  [string]$Server = $(if ($env:PG_SERVER) { $env:PG_SERVER } else { "pg-serenity55727" }),
  [string]$Database = $(if ($env:PG_DB) { $env:PG_DB } else { "serenity" }),
  [string]$MigrateUser = $(if ($env:MIGRATE_USER) { $env:MIGRATE_USER } else { "serenity_migrate" })
)

# az/node menulis ke stderr pada kondisi normal (warning SSL pg, progress az).
# Jangan biarkan itu menghentikan script: pakai cek $LASTEXITCODE eksplisit.
$ErrorActionPreference = "Continue"

# Prompt password butuh konsol. Di konteks non-konsol (pipe/CI/agent) Read-Host
# menggantung diam-diam -> gagalkan cepat dengan pesan jelas.
if ([Console]::IsInputRedirected) { Write-Error "Prompt password butuh terminal interaktif; stdin dialihkan."; exit 1 }

$fqdn = if ($env:PG_FQDN) { $env:PG_FQDN } else { "$Server.postgres.database.azure.com" }
$rule = "migrate-prod-$($PID)"

# 1) Password role migrate: input tersembunyi, hanya hidup di memori proses ini.
$secure = Read-Host -AsSecureString "Password role '$MigrateUser' (tak akan terlihat/disimpan)"
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}
if ([string]::IsNullOrEmpty($plain)) { Write-Error "Password kosong, dibatalkan."; exit 1 }

# 2) IP publik lokal (Azure PG butuh firewall per-IP; jangan 0.0.0.0).
$ip = (Invoke-RestMethod -Uri "https://api.ipify.org").Trim()
Write-Host "IP lokal: $ip - buka firewall rule sementara '$rule'"
az postgres flexible-server firewall-rule create -g $ResourceGroup -s $Server -n $rule `
  --start-ip-address $ip --end-ip-address $ip -o none
if ($LASTEXITCODE -ne 0) { throw "Gagal buka firewall rule '$rule' (exit $LASTEXITCODE)." }

$opened = $true
try {
  # 3) Migrasi via runner yang sama dengan CI (nomor + lock + checksum).
  $conn = "postgres://${MigrateUser}:${plain}@${fqdn}:5432/${Database}?sslmode=verify-full"
  $env:DATABASE_URL = $conn
  Write-Host "Menjalankan migrasi..."
  node "$PSScriptRoot/migrate.js"
  $code = $LASTEXITCODE

  # 4) Seed katalog dev bersifat idempoten (ON CONFLICT), aman di prod.
  if ($code -eq 0 -and (Test-Path "$PSScriptRoot/seed.js")) {
    Write-Host "Seed idempoten (katalog)..."
    node "$PSScriptRoot/seed.js"
  }
  if ($code -ne 0) { throw "Migrasi gagal (exit $code)." }
} finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  $plain = $null
  if ($opened) {
    Write-Host "Tutup firewall rule '$rule'"
    az postgres flexible-server firewall-rule delete -g $ResourceGroup -s $Server -n $rule --yes -o none
    if ($LASTEXITCODE -ne 0) {
      Write-Warning "GAGAL tutup rule '$rule' - tutup manual: az postgres flexible-server firewall-rule delete -g $ResourceGroup -s $Server -n $rule --yes"
    }
    $remaining = az postgres flexible-server firewall-rule list -g $ResourceGroup -s $Server --query "[].name" -o tsv
    Write-Host "Rule tersisa: $remaining"
  }
}
