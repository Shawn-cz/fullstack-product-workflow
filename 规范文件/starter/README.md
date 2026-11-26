# 团队黄金技术栈一键初始化脚手架 (`starter/`)

版本：1.0.0｜对应规则：`STD-ARC-09`、`STD-REACT-01~04`、`STD-SEC-05`、`STD-QA-13`、`STD-QA-14`、`STD-GOV-05`

## 为什么提供本脚手架？
避免零开发经验成员每次新开项目都让 AI 从零拼装 `package.json`、`tsconfig.json`、Preline UI 路由挂载、Prisma PostgreSQL 连接、RBAC 鉴权中间件、测试种子账号与 CI 四道硬门禁。运行一条命令即可生成 100% 符合团队黄金栈标准的空壳底座。

## 一键初始化命令

在新建的业务项目根目录执行（路径指向工作流包内的 `init-project.mjs`）：

```bash
node 规范文件/starter/init-project.mjs --target .
```

*(默认保护已有文件不覆盖；若确需重置脚手架文件可附加 `--force`。)*

## 自动生成的标准项目结构

| 生成路径 | 来源 | 核心作用 |
|---|---|---|
| `package.json` | `templates/package.json.tpl` | 固化 React 19 + TS + Vite + Tailwind + Preline + Zustand + TanStack Query + Hono + Zod + Prisma + Vitest 与全部一键命令 |
| `tsconfig.json` / `vite.config.ts` / `eslint.config.mjs` | `templates/*.tpl` | TypeScript `strict` 严格配置、Vite React 构建与 ESLint 静态检查 |
| `.env.example` / `docker-compose.postgres.yml` | `templates/` + `ci/` | PostgreSQL 16 同构数据库环境变量与本地一键容器（彻底禁用 SQLite） |
| `prisma/schema.prisma` | `templates/schema.prisma.tpl` | 预置 `User`、`Session`（可吊销会话）、`AuditLog`、`IdempotencyRecord` 四张通用底座表 |
| `prisma/seed.ts` | `templates/seed.ts.tpl` | 预置 4 个黑盒验真合成账号（`ADMIN`/`HANDLER`/`MEMBER_A`/`MEMBER_B`），含 `NODE_ENV=production` 熔断保护 |
| `shared/contracts/` | `contracts/` | 同构 `base-contract.schema.ts`（零 Node 依赖）+ 服务端专用 `fingerprint.server.ts` + `openapi-baseline.yaml` |
| `src/hooks/usePrelineInit.ts` | `templates/usePrelineInit.ts.tpl` | 解决 React 路由切换后 Preline UI 弹窗/下拉交互失效的通用 Hook |
| `server/middleware/auth-rbac.ts` | `templates/auth-rbac.ts.tpl` | 服务端三层 RBAC 认证与权限拦截中间件（`requireAuth` / `requireRole` / `assertOwnerOrRole`） |
| `scripts/build-index-tree.mjs` / `scripts/verify-gates.mjs` / `.github/workflows/ci.yml` | `ci/` | 自动索引树生成 + 四道自动化硬门禁 + 双向 `REQ/AC` 覆盖核对 |

## 初始化后零经验成员 4 步跑通本地底座

1. 复制 `.env.example` 为 `.env`（无需改即可连本地 Docker PostgreSQL）；
2. 启动数据库：`npm run db:up`
3. 安装依赖、建表并灌入 4 个黑盒验真账号：`npm install && npm run db:migrate && npm run db:seed`
4. 刷新索引树并运行自检：`npm run index:build && npm run gates`
