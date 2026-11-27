# 团队黄金技术栈全生命周期一键初始化脚手架 (`starter/`)

版本：1.3.0｜对应规则：`STD-ARC-09`、`STD-REACT-01~04`、`STD-FE-07`、`STD-CODE-12`、`STD-SEC-05`、`STD-QA-13/14`、`STD-OPS-07/08`、`STD-GOV-05`

## 前置本机环境要求
首次运行前确认已安装：`Node.js >= 20`、`Git`、`Docker Desktop`（用于本地 PostgreSQL 16 容器）。

## 为什么提供本脚手架？
避免零开发经验成员每次新开项目都让 AI 从零拼装配置、入口文件、品牌视觉样式、Preline 路由挂载、PostgreSQL 底座、RBAC 鉴权、脱敏日志、测试种子账号、Playwright 双账号越权测试底座、Pre-commit 门禁、PR 审核模板与生产 Docker/HTTPS/备份脚本。运行一条命令即可生成可直接 `npm install && npm run check && npm run build` 的最小可运行底座（32 项映射，含 `.gitignore` 共 **33 个标准文件**，另附 S6 越权 E2E 样板）。

## 一键初始化命令

```bash
# 在新建业务项目根目录执行：
node 规范文件/starter/init-project.mjs --target .
```

## 自动生成的全生命周期底座清单（33 文件）

| 目标路径 | 来源 | 作用 |
|---|---|---|
| `package.json` / `tsconfig` / `vite` / `eslint` | `templates/*.tpl` | 固化 React 19 + TS strict + Vite + Tailwind v4 + Preline + Hono + `@hono/node-server` + Pino + Prisma + esbuild + Vitest + Playwright |
| `index.html` / `src/main.tsx` / `src/App.tsx` / `server/index.ts` | `templates/*.tpl` | **最小可运行前后端入口**：前端接入 `theme.css` 与 `usePrelineInit` 并探测 `/healthz`；后端挂脱敏日志、全局异常指纹、`/healthz` `/readyz` 与生产 `dist/` 静态托管 |
| `src/styles/theme.css` / `src/hooks/usePrelineInit.ts` | `templates/` | 团队统一 Brand Design Token 预设（`STD-FE-07`）与 Preline SPA 路由自动初始化 Hook |
| `prisma/schema.prisma` / `prisma/test-accounts.ts` / `prisma/seed.ts` | `templates/` | PostgreSQL 4 表底座 + 纯账号真相源 + 4 角色黑盒/E2E 合成账号（含 `NODE_ENV=production` 熔断保护） |
| `playwright.config.ts` / `tests/e2e/fixtures/auth-contexts.ts` | `templates/` | Playwright 自动拉起前后端 `/readyz` 与双隔离上下文（透传 `baseURL`），另附 `examples/rbac-isolation.spec.ts.example` 供 S6 实例化 |
| `shared/contracts/` | `contracts/` | 同构 `base-contract.schema.ts`（无 Node 依赖）+ 服务端 `fingerprint.server.ts` + `openapi-baseline.yaml` |
| `server/middleware/auth-rbac.ts` & `logger-trace.ts` | `templates/` | 三层 RBAC 认证中间件 + `pino` 自动脱敏日志、`requestTraceId` 与 `errorFingerprint` |
| `.githooks/pre-commit` / `.github/pull_request_template.md` / `ci.yml` | `ci/` | 本地提交前前置门禁、多人协作 PR 审核模板、自动索引树与四道 CI 门禁 |
| `Dockerfile` / `docker-compose.prod.yml` / `Caddyfile` / `health-probes.ts` / `backup-postgres.mjs` | `deploy/` | S8 预编译纯 Node 非 root 镜像、单 `.env.production` 内网隔离 PostgreSQL、自动 HTTPS、探针与 `.sha256` 备份脚本 |

## 初始化后 5 步启动开发
1. 复制 `.env.example` 为 `.env`；
2. 安装依赖并启用本地 Git Pre-commit：`npm install && npm run hooks:install`；
3. 启动本地 PostgreSQL 16、建表并灌入 4 角色测试账号：`npm run db:up && npm run db:migrate && npm run db:seed`；
4. 刷新索引树并执行门禁、静态检查与全栈构建：`npm run index:build && npm run gates && npm run check && npm run build`（S0 空底座门禁默认放行，进入 S2+ 写 `REQ`/`AC` 后强制要求对应测试）；
5. 进入 S6 后基于 `examples/rbac-isolation.spec.ts.example` 补齐 `tests/e2e/*.spec.ts`，运行 `npm run test:e2e:fresh`，验收通过后运行 `npm run gates:lock` 锁定指纹基线。
