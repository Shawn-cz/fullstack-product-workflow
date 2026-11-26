# 团队黄金技术栈全生命周期一键初始化脚手架 (`starter/`)

版本：1.1.0｜对应规则：`STD-ARC-09`、`STD-REACT-01~04`、`STD-FE-07`、`STD-CODE-12`、`STD-SEC-05`、`STD-QA-13/14`、`STD-OPS-07/08`、`STD-GOV-05`

## 为什么提供本脚手架？
避免零开发经验成员每次新开项目都让 AI 从零拼装配置、品牌视觉样式、Preline 路由挂载、PostgreSQL 底座、RBAC 鉴权、脱敏日志、测试种子账号、Pre-commit 门禁、PR 审核模板与生产 Docker/HTTPS/备份脚本。运行一条命令即可生成 100% 符合团队全生命周期标准的空壳底座（共 26 个标准文件）。

## 一键初始化命令

在新建的业务项目根目录执行（路径指向工作流包内的 `init-project.mjs`）：

```bash
node 规范文件/starter/init-project.mjs --target .
```

*(默认保护已有文件不覆盖；若确需重置脚手架文件可附加 `--force`。)*

## 自动生成的标准项目结构（S0–S8 全覆盖）

| 生成路径 | 来源 | 核心作用 |
|---|---|---|
| `package.json` / `tsconfig` / `vite` / `eslint` | `templates/*.tpl` | 固化 React 19 + TS strict + Vite + Tailwind + Preline + Hono + Pino + Prisma + Vitest 与全套一键命令 |
| `src/styles/theme.css` / `src/hooks/usePrelineInit.ts` | `templates/` | 团队统一 Brand Design Token 预设（`STD-FE-07`）与 Preline SPA 路由自动初始化 Hook |
| `prisma/schema.prisma` / `prisma/seed.ts` | `templates/` | PostgreSQL 4 表底座 + 4 角色黑盒验真合成账号（含 `NODE_ENV=production` 熔断保护） |
| `shared/contracts/` | `contracts/` | 同构 `base-contract.schema.ts`（零 Node 依赖）+ 服务端 `fingerprint.server.ts` + `openapi-baseline.yaml` |
| `server/middleware/auth-rbac.ts` & `logger-trace.ts` | `templates/` | 三层 RBAC 认证中间件 + `pino` 自动脱敏日志、`requestTraceId` 与 `errorFingerprint` |
| `.githooks/pre-commit` / `.github/pull_request_template.md` / `ci.yml` | `ci/` | 本地提交前 2 秒前置门禁、多人协作 PR 审核模板、自动索引树与双向闭环四道 CI 门禁 |
| `Dockerfile` / `docker-compose.prod.yml` / `Caddyfile` / `health-probes.ts` / `backup-postgres.mjs` | `deploy/` | S8 非 root 多阶段生产镜像、Caddy 自动 HTTPS、`/healthz`+`/readyz` 双探针与 PostgreSQL 一键备份恢复 |

## 初始化后零经验成员 4 步跑通本地底座

1. 复制 `.env.example` 为 `.env`（无需改即可连本地 Docker PostgreSQL）；
2. 启动数据库并安装依赖、启用本地 Git Pre-commit 门禁：`npm run db:up && npm install && npm run hooks:install`
3. 建表并灌入 4 个黑盒验真账号：`npm run db:migrate && npm run db:seed`
4. 刷新索引树并运行自检：`npm run index:build && npm run gates`
