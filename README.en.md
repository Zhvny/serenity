<div align="center">
  <img src="frontend/public/brand/logo-lockup-light.png" alt="Serenity" width="320" />

  **Serenity — Healthy Pre-Order**

  ![Vite 8](https://img.shields.io/badge/Vite-8-93c572) ![React 19](https://img.shields.io/badge/React-19-3f6f3c) ![Hono](https://img.shields.io/badge/Hono-API-93c572) ![PostgreSQL 15](https://img.shields.io/badge/PostgreSQL-15-3f6f3c)

  Language: [Indonesia](README.md) · **English** · [中文](README.zh-CN.md)
</div>

Healthy food ordering and pre-order app; mains, healthy desserts, and healthy drinks in one menu, complete with nutrition and allergen info. Payment via quasi-static QRIS (manual admin verification).

## Key Features

- **Menu** - responsive 1→2→3 column grid + category/tag filters, skeleton loading, empty/error states.
- **Product detail** - nutrition (calories, protein, carbs, fat, fiber, sugar) + allergens (peanut, milk, gluten, egg, seafood, soy).
- **Cart** - portions, notes, Instant/Scheduled mode, pickup/delivery (map-based address).
- **QRIS checkout** - unique code + exact nominal + QR, status polling; `/thanks` and `/status/:code` pages are session-bound (ADR-0001).
- **Admin** - session login (lockout + audit), product management, pending list, Mark Paid (`paid_amount`), fulfillment `paid → preparing → ready → done`.
- **Security** - session/CSRF/rate-limit/audit log; write-only PII + 30-day TTL.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | [Vite](https://vite.dev) 8 + [React](https://react.dev) 19 + React Compiler, react-router, native fetch, CSS tokens (`DESIGN.md`), npm |
| Backend | Node 22 + [Hono](https://hono.dev) + strict TypeScript, `pg` Pool (parameterized), `zod`, `node --test` |
| Database | [PostgreSQL](https://www.postgresql.org) 15+ (numbered migrations + lock + checksum) |
| Payment | Quasi-static QRIS (no gateway) |
| Deploy | [Azure](https://azure.microsoft.com): Static Web Apps + Container Apps + PG Flexible + ACR + Key Vault |

## Directory Structure

```
serenity/
├── frontend/
│   ├── src/
│   │   ├── components/            # Header, FilterBar, ProductCard, Icon, Footer, LocationPicker, ErrorBoundary
│   │   ├── pages/                 # Menu, Detail, Cart, Checkout, Thanks, Status, Admin, NotFound (+ *.test.tsx)
│   │   ├── services/api.ts        # fetch wrapper + api.test.ts
│   │   ├── utils/format.ts        # rupiah etc.
│   │   └── index.css              # DESIGN.md tokens
│   └── index.html
├── backend/
│   ├── src/
│   │   ├── routes/                # menu, cart, orders, qris, admin.ts
│   │   ├── services/              # menu, cart, orders, adminAuth.ts
│   │   ├── repos/products.ts      # product queries
│   │   ├── db/{pool,redis}.ts     # PG pool + fail-open Redis
│   │   └── middleware/{csrf,security}.ts
│   ├── migrations/                # 001–022 (*.sql + *.down.sql) + seed_dev.sql
│   ├── scripts/migrate.js         # numbered runner + lock + checksum
│   └── tests/                     # node --test: admin, cart, orders, qris, security, e2e… (≥80% handlers)
├── infra/                         # azure.sh (provisioning), db-roles.sql (2-role), pii-ttl.sql, restore-test.sh
├── .github/workflows/deploy.yml   # CI: lint → verify → acr build → migrate → rollout → SWA
└── README.md
```

Browse the code: [frontend](frontend/) · [backend](backend/) · [infra](infra/) · [CI deploy](.github/workflows/deploy.yml)

## Run (Development)

Prerequisites: Node.js 22+, PostgreSQL 15+, Redis (optional, fail-open rate-limit).

```bash
# Database
createdb serenity

# Backend (:3000)
cd backend/
cp .env.example .env   # fill: DATABASE_URL, QUASI_STATIC_QR_URL, ADMIN_USER, ADMIN_PASS_HASH (salt:hexhash)
npm ci
npm run migrate
psql "$DATABASE_URL" -f migrations/seed_dev.sql   # optional
npm run dev

# Frontend (:5173), other terminal
cd frontend/
npm install
npm run dev   # VITE_API_URL defaults to http://localhost:3000/api/v1
```

Verify: `npm test` (backend `node --test`, frontend Vitest) + `tsc` + lint.

## License

`MIT LICENSE` (Copyright © 2026 Serenity).
