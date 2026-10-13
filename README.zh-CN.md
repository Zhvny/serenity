<div align="center">
  <img src="frontend/public/brand/logo-lockup-light.png" alt="Serenity" width="320" />

  **Serenity — 健康预订**

  ![Vite 8](https://img.shields.io/badge/Vite-8-93c572) ![React 19](https://img.shields.io/badge/React-19-3f6f3c) ![Hono](https://img.shields.io/badge/Hono-API-93c572) ![PostgreSQL 15](https://img.shields.io/badge/PostgreSQL-15-3f6f3c)

  语言: [Indonesia](README.md) · [English](README.en.md) · **中文**
</div>

健康食品订购与预订应用；主食、健康甜点、健康饮品集中在一个菜单中，并附营养成分与过敏原信息。通过准静态 QRIS 付款（管理员人工核验）。

## 主要功能

- **菜单** - 1→2→3 列响应式网格 + 分类/标签筛选、骨架屏加载、空/错误状态。
- **商品详情** - 营养成分（热量、蛋白质、碳水、脂肪、纤维、糖）+ 过敏原（花生、牛奶、麸质、鸡蛋、海鲜、大豆）。
- **购物车** - 份量、备注、即时/预约模式、自取/配送（地图选址）。
- **QRIS 结账** - 唯一付款码 + 精确金额 + 二维码、状态轮询；`/thanks` 与 `/status/:code` 页面绑定会话（ADR-0001）。
- **管理后台** - 会话登录（锁定 + 审计）、商品管理、待处理列表、标记已付（`paid_amount`）、履约流程 `paid → preparing → ready → done`。
- **安全** - 会话/CSRF/限流/审计日志；PII 只写不读 + 30 天 TTL。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | [Vite](https://vite.dev) 8 + [React](https://react.dev) 19 + React Compiler、react-router、原生 fetch、CSS 变量（`DESIGN.md`）、npm |
| 后端 | Node 22 + [Hono](https://hono.dev) + 严格 TypeScript、`pg` 连接池（参数化查询）、`zod`、`node --test` |
| 数据库 | [PostgreSQL](https://www.postgresql.org) 15+（编号迁移 + 锁 + 校验和） |
| 支付 | 准静态 QRIS（无支付网关） |
| 部署 | [Azure](https://azure.microsoft.com)：Static Web Apps + Container Apps + PG Flexible + ACR + Key Vault |

## 目录结构

```
serenity/
├── frontend/
│   ├── src/
│   │   ├── components/            # Header、FilterBar、ProductCard、Icon、Footer、LocationPicker、ErrorBoundary
│   │   ├── pages/                 # Menu、Detail、Cart、Checkout、Thanks、Status、Admin、NotFound（+ *.test.tsx）
│   │   ├── services/api.ts        # fetch 封装 + api.test.ts
│   │   ├── utils/format.ts        # 印尼盾格式化等
│   │   └── index.css              # DESIGN.md 变量
│   └── index.html
├── backend/
│   ├── src/
│   │   ├── routes/                # menu、cart、orders、qris、admin.ts
│   │   ├── services/              # menu、cart、orders、adminAuth.ts
│   │   ├── repos/products.ts      # 商品查询
│   │   ├── db/{pool,redis}.ts     # PG 连接池 + 降级 Redis
│   │   └── middleware/{csrf,security}.ts
│   ├── migrations/                # 001–022（*.sql + *.down.sql）+ seed_dev.sql
│   ├── scripts/migrate.js         # 编号迁移执行器 + 锁 + 校验和
│   └── tests/                     # node --test：admin、cart、orders、qris、security、e2e…（≥80% handler）
├── infra/                         # azure.sh（资源开通）、db-roles.sql（双角色）、pii-ttl.sql、restore-test.sh
├── .github/workflows/deploy.yml   # CI：lint → verify → acr 构建 → 迁移 → 发布 → SWA
└── README.md
```

浏览代码: [frontend](frontend/) · [backend](backend/) · [infra](infra/) · [CI deploy](.github/workflows/deploy.yml)

## 运行（开发）

前置要求：Node.js 22+、PostgreSQL 15+、Redis（可选，限流降级）。

```bash
# 数据库
createdb serenity

# 后端（:3000）
cd backend/
cp .env.example .env   # 填写：DATABASE_URL、QUASI_STATIC_QR_URL、ADMIN_USER、ADMIN_PASS_HASH（salt:hexhash）
npm ci
npm run migrate
psql "$DATABASE_URL" -f migrations/seed_dev.sql   # 可选
npm run dev

# 前端（:5173），另一个终端
cd frontend/
npm install
npm run dev   # VITE_API_URL 默认为 http://localhost:3000/api/v1
```

验证：`npm test`（后端 `node --test`、前端 Vitest）+ `tsc` + lint。

## 许可证

`MIT LICENSE`（Copyright © 2026 Serenity）。
