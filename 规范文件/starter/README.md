# 团队黄金技术栈全生命周期一键初始化脚手架 (`starter/`)

版本：1.4.1｜对应规则：`STD-ARC-09`、`STD-REACT-01~04`、`STD-FE-07`、`STD-CODE-12`、`STD-SEC-05`、`STD-QA-13/14`、`STD-OPS-07/08`、`STD-GOV-05`

## 前置本机环境要求
首次运行前确认已安装：`Node.js >= 20.19（推荐 22 LTS）`、`Git`、`Docker Desktop`（用于本地 PostgreSQL 16 容器）。

## 为什么提供本脚手架？
避免零开发经验成员每次新开项目都让 AI 从零拼装配置、入口文件、认证接口、品牌视觉样式、Preline 路由挂载、PostgreSQL 底座、RBAC 鉴权、脱敏日志、测试种子账号、Playwright 双账号越权测试底座、Pre-commit 门禁、PR 审核模板与生产 Docker/HTTPS/备份脚本。运行一条命令即可生成可直接 `npm install && npm run check && npm run build` 的最小可运行底座（37 项映射 + `.gitignore`/`.dockerignore`/`.gitattributes` 共 **40 个标准文件**，另附 S6 越权 E2E 样板）。

## 一键初始化命令

```bash
# 在新建业务项目根目录执行：
node 规范文件/starter/init-project.mjs --target .
```

## 自动生成的全生命周期底座清单（40 文件）

| 目标路径 | 来源 | 作用 |
|---|---|---|
| `.gitignore` / `.dockerignore` / `.gitattributes` | 脚手架内置生成 | 排除敏感文件与构建产物进入 Git / Docker 构建层，并在跨操作系统统一 LF 换行符 |
| `package.json` / `tsconfig` / `vite` / `eslint` | `templates/*.tpl` | 固化 React 19 + TS strict + Vite + Tailwind v4 + Preline + Hono + Pino + Prisma + esbuild + Vitest + Playwright（ESLint 已排除 `规范文件/**`） |
| `index.html` / `src/main.tsx` / `src/App.tsx` / `server/index.ts` / `server/config/env.ts` / `server/routes/auth.ts` | `templates/*.tpl` | **最小可运行前后端与安全认证底座**：Zod 环境校验、`csrf`/Origin 防护、`requestTraceId`、`/api/auth/login|logout|me`（契约对齐/限流/恒定时间异步 `scrypt`/严格吊销）、`protectedApi` 容器、`/healthz` `/readyz`（含 Schema 核验）与缓存 `dist/` 静态托管 |
| `src/styles/theme.css` / `src/hooks/usePrelineInit.ts` | `templates/` | 团队统一 Brand Design Token 预设（`STD-FE-07`）与 Preline SPA 路由自动初始化 Hook |
| `prisma/schema.prisma` / `prisma/test-accounts.ts` / `prisma/seed.ts` / `scripts/safe-db-reset.mjs` | `templates/` | PostgreSQL 4 表底座 + 纯账号真相源 + 4 角色测试种子 + 双库强隔离清库与独立测试端口执行器 |
| `playwright.config.ts` / `tests/e2e/fixtures/auth-contexts.ts` | `templates/` | Playwright 自动读取 `.env` 端口拉起前后端 `/readyz` 与双隔离上下文（透传 `baseURL`），另附 `examples/rbac-isolation.spec.ts.example` 供 S6 实例化 |
| `shared/contracts/` | `contracts/` | 同构 `base-contract.schema.ts`（含 `buildApiSuccess`/`buildApiError`，无 Node 依赖）+ 服务端 `fingerprint.server.ts` + `openapi-baseline.yaml` |
| `server/middleware/auth-rbac.ts` & `logger-trace.ts` | `templates/` | `createRequireAuth` / `requireRole` / `assertOwnerOrRole` Hono 中间件 + `pino` 字段脱敏日志与异常安全摘要 |
| `.githooks/pre-commit` / `.github/pull_request_template.md` / `ci.yml` | `ci/` | 只读本地提交前门禁（不自动 `git add`）、多人协作 PR 审核模板、索引树、仅绑定 `127.0.0.1` 的本地 Postgres 与四道 CI 门禁 |
| `Dockerfile` / `docker-compose.prod.yml` / `Caddyfile` / `deploy/init-app-user.sh` / `scripts/run-migrate.mjs` / `health-probes.ts` / `backup-postgres.mjs` | `deploy/` | S8 预编译非 root 镜像、`app` 环境变量白名单、先 `migrate` 并同步 `APP_DB_USER` 表权限后再启 `app`、自动 HTTPS、探针与流式/单事务备份恢复脚本 |

## 初始化后 5 步启动开发
1. 若尚未初始化业务仓库先运行 `git init`，并复制 `.env.example` 为 `.env`（已默认配置独立 `TEST_DATABASE_URL` 防误清开发库）；
2. 安装依赖并启用本地 Git Pre-commit：`npm install && npm run hooks:install`；
3. 启动本地 PostgreSQL 16（含 `--wait` 等待健康就绪）、建表并灌入 4 角色测试账号：`npm run db:up && npm run db:migrate && npm run db:seed`；
4. 刷新索引树并执行门禁、静态检查与全栈构建：`npm run index:build && npm run gates && npm run check && npm run build`（`npm run gates` 运行 Gate 1/2/4，S0 尚无 `REQ/AC` 时放行；小变更可用 `--scope=minor`，已有工程可用 `.workflow-profile.json` 裁剪；S0 运行 `npm run test:e2e:fresh` 会因无用例安全跳过清库）；
5. 进入 S6 后基于 `examples/rbac-isolation.spec.ts.example` 补齐 `tests/e2e/*.spec.ts`，安装浏览器 `npx playwright install chromium` 并运行 `npm run test:e2e:fresh`（独立 `TEST_DATABASE_URL` 与端口 `3101/5273`），验收通过后运行 `npm run gates:lock` 锁定指纹基线。
