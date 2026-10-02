# Serenity

Aplikasi pemesanan dan pre-order makanan sehat; makanan utama, dessert sehat, dan minuman sehat dalam satu menu, lengkap dengan info nutrisi dan alergen. Pembayaran via QRIS quasi-statis (verifikasi manual admin).

## Fitur Utama

- **Menu** - grid responsif 1→2→3 kolom + filter kategori/tag, skeleton loading, empty/error state.
- **Detail produk** - nutrisi (kalori, protein, karbo, lemak, serat, gula) + alergen (kacang, susu, gluten, telur, seafood, kedelai).
- **Cart** - porsi, catatan, mode Instant/Scheduled, pickup/delivery (alamat via peta).
- **Checkout QRIS** - kode unik + nominal persis + QR, polling status; halaman `/thanks` dan `/status/:code` terikat sesi (ADR-0001).
- **Admin** - login session (lockout + audit), kelola produk, daftar pending, Tandai Lunas (`paid_amount`), fulfillment `paid → preparing → ready → done`.
- **Keamanan** - session/CSRF/rate-limit/audit log; PII tulis-saja + TTL 30 hari.

## Stack Teknologi

| Layer | Teknologi |
|---|---|
| Frontend | Vite 8 + React 19 + React Compiler, react-router, fetch native, CSS token (`DESIGN.md`), npm |
| Backend | Node 22 + Hono + TypeScript strict, `pg` Pool (parameterized), `zod`, `node --test` |
| Database | PostgreSQL 15+ (migrasi bernomor + lock + checksum) |
| Pembayaran | QRIS quasi-statis (tanpa gateway) |
| Deploy | Azure: Static Web Apps + Container Apps + PG Flexible + ACR + Key Vault |

## Struktur Direktori

```
serenity/
├── frontend/
│   ├── src/
│   │   ├── components/   # Header, FilterBar, ProductCard, Icon, Footer, LocationPicker, ErrorBoundary
│   │   ├── pages/        # Menu, Detail, Cart, Checkout, Thanks, Status, Admin, NotFound (+ *.test.tsx)
│   │   ├── services/api.ts        # fetch wrapper + api.test.ts
│   │   ├── utils/format.ts        # rupiah dsb.
│   │   └── index.css              # token DESIGN.md
│   └── index.html
├── backend/
│   ├── src/
│   │   ├── routes/       # menu, cart, orders, qris, admin.ts
│   │   ├── services/     # menu, cart, orders, adminAuth.ts
│   │   ├── repos/products.ts      # query produk
│   │   ├── db/{pool,redis}.ts     # PG pool + Redis fail-open
│   │   └── middleware/{csrf,security}.ts
│   ├── migrations/       # 001–010 (*.sql + *.down.sql) + seed_dev.sql
│   ├── scripts/migrate.js         # runner bernomor + lock + checksum
│   └── tests/            # node --test: admin, cart, orders, qris, security, e2e… (≥80% handler)
├── infra/                # azure.sh (provisioning), db-roles.sql (2-role), pii-ttl.sql, restore-test.sh
├── docs/                 # SPEC, DESIGN, API, env-reference, adr/, specs/, azure-deployment-plan.md
├── .github/workflows/deploy.yml   # CI: lint → verify → acr build → migrasi → rollout → SWA
└── README.md
```

## Cara Run (Development)

Prasyarat: Node.js 22+, PostgreSQL 15+, Redis (opsional, rate-limit fail-open).

```bash
# Database
createdb serenity

# Backend (:3000)
cd backend/
cp .env.example .env   # isi: DATABASE_URL, QUASI_STATIC_QR_URL, ADMIN_USER, ADMIN_PASS_HASH (salt:hexhash)
npm ci
npm run migrate
psql "$DATABASE_URL" -f migrations/seed_dev.sql   # opsional
npm run dev

# Frontend (:5173), terminal lain
cd frontend/
npm install
npm run dev   # VITE_API_URL default http://localhost:3000/api/v1
```

Verifikasi: `npm test` (backend `node --test`, frontend Vitest) + `tsc` + lint.

## Deployment

Target aktual = **Azure**. Ikuti `DEPLOY-AZURE.md` (bash) atau `DEPLOY-AZURE.ps1` (PowerShell): provisioning → Key Vault + GitHub secrets → push → CI deploy → verifikasi/rollback.

## Dokumen

`SPEC.md` (kontrak + never-do) · `DESIGN.md` (UI/UX) · `API.md` · `DATABASE.md` · `docs/env-reference.md` · `AGENTS.md` (aturan agent).

## License

MIT — lihat `LICENSE` (Copyright © 2026 Fransiskus Xaverius Kevin).
