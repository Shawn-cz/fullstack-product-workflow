# 变更日志

## 1.3.0 — 2026-11-27（可运行全栈底座、生产编译修复与仓库内置维护脚本）

- **P0 修复：脚手架补齐最小可运行前后端入口与预编译生产镜像**：
  - 新增 `index.html.tpl`、`main.tsx.tpl`、`App.tsx.tpl`、`server-index.ts.tpl`（Hono + `@hono/node-server`，挂脱敏日志、全局异常指纹、`/healthz` `/readyz` 与生产 `dist/` 静态托管），`init-project.mjs` 升级至 32 项映射生成 33 文件，初始化后可直接执行 `npm install && npm run check && npm run build`。
  - `package.json.tpl` 新增 `build:server`（`esbuild` 预编译 `dist-server/index.mjs`）、`start`、`gates:lock`，并将 `prisma` 移入 `dependencies`；`deploy/Dockerfile` 运行阶段改为纯 `CMD ["node", "dist-server/index.mjs"]`（无需运行时 `tsx`，支持离线执行 `prisma migrate deploy`）。
  - 修复 Gate 1 在 S0 空底座（尚无 `docs/` `REQ/AC` 且无测试）直接报错的问题；CI `Gate 3b` 同步适配 S0 尚无单元测试场景。
- **P1 修复：诚实对齐 Gate 4/Gate 2 能力边界、统一生产环境变量与补齐前置清单**：
  - `verify-gates.mjs` Gate 4 补齐 `--lock`（`npm run gates:lock`）生成 `docs/evidence/fingerprint-lock.json`，并将锁文件与源码树（`src/server/shared`）纳入四重指纹漂移拦截；文档明确标注 Gate 2 正则扫描为前置静态防呆提醒，不替代运行时权限测试。
  - `deploy/docker-compose.prod.yml` 与 `deploy/README.md` 统一仅维护单份 `.env.production`（`docker compose --env-file .env.production ...`）。
  - `开始使用.md` / `README.md` 与 `starter/README.md` 新增本机前置环境准备清单（Node 20、Git、Docker Desktop）。
- **P2 修复：内置仓库维护脚本、去 Git 清单冲突、精简 `SKILL.md` 与措辞去夸大**：
  - 新增 `规范文件/ci/maintain-workflow.mjs`（`--split-templates` / `--check` / `--pack`），将拆模板、行号/断链/体积校验与清单生成固化进仓库。
  - 将 `交付文件清单.json` 与 `规范文件/文档检查结果.json` 加入 `.gitignore` 仅在本地打包时生成，消除多机交替升级冲突。
  - 精简 `SKILL.md` 与 `AGENTS.md` 均至 `< 5KB`（符合 `ARCHITECTURE.md` 上限约定）；统一全仓活动文件版本号至 `v1.3.0`，清理过度绝对化表述，并在临时目录执行真实的 `npm install` → `check` → `build` → `node dist-server/index.mjs` HTTP 探针实测。
- **真实安装编译期额外捕获并修复的 4 处模板缺陷**：
  - 修复 `package.json.tpl` `prepare` 钩子 `|| true` 在 Windows 非 Git 目录下导致 `npm install` 报错退出（改为跨平台 Node 检测 `.git`）；
  - 修复 `seed.ts.tpl` 与 `server-index.ts.tpl` 在 `noUncheckedIndexedAccess: true` 下 `process.argv[1]` 未窄化导致的 `tsc` 报错；
  - 修复 `eslint.config.mjs.tpl` 缺少 `scripts/*.mjs` Node 全局变量及 `react-hooks` 误扫 Playwright Fixture `use` 参数导致的 105 条 ESLint 报错（`react-hooks` 现仅作用于 `src/**`）。

## 1.2.0 — 2026-11-26（全生命周期与自动化越权闭环版：接入 Playwright Gate 3d 双账号隔离自动验收）

- **Playwright 双隔离上下文自动化越权底座（替代人工双无痕窗口与 F12 核验）**：
  - 将 `starter/templates/seed.ts.tpl` 中的合成账号拆出纯数据模块 `starter/templates/test-accounts.ts.tpl`（`prisma/test-accounts.ts` 单一真相源，无导入副作用），`seed.ts` 保留 `NODE_ENV=production` 熔断保护并支持主模块入口判断。
  - 新增 `starter/templates/playwright.config.ts.tpl`（自动拉起后端 `/readyz` 与前端 Vite 并输出 `docs/evidence/playwright-report` HTML 报告）、`starter/templates/auth-contexts.ts.tpl`（程序化双无痕窗口 `anonContext`/`memberA`/`memberB`/`handler`/`admin` 及 `assertHttpOnlySessionAndCleanStorage` 红线校验）与 S6 实例化样板 `starter/examples/rbac-isolation.spec.ts.example`（覆盖 `401`/`403`/`404`、IDOR 列表/详情隔离截图与退出登录会话吊销）。
  - **门禁与 Vitest 零冲突隔离**：`vite.config.ts.tpl` 排除 `tests/e2e/**` 避免 Vitest 误扫；`starter/init-project.mjs` 升级至 28 项映射生成 29 文件（不提前生成带占位 `REQ/AC` 的 `.spec.ts`，避免触发 Gate 1 幽灵编号拦截）；`build-index-tree.mjs` 与 `verify-gates.mjs` 忽略 `playwright-report`/`test-results` 目录，防止生成报告后索引树检查变红。
- **CI `Gate 3d` 全自动运行与报告归档**：
  - 启用 `规范文件/ci/github-actions-ci.yml` 中的 `Gate 3a-2`（自动灌入 4 角色测试种子）与 `Gate 3d`（检测 `tests/e2e/*.spec.ts` 时自动安装 Chromium 跑 `npm run test:e2e` 并上传 `playwright-rbac-report` 报告与截图 Artifact）。
  - 同步更新 `STD-QA-12~14`、`contracts/auth-rbac-baseline.md`、`pull_request_template.md`、`T07`、`SKILL.md`、`AGENTS.md`、`INDEX_TREE.md`、`00`/`02`/`04`/`06`、`README.md` 与 `开始使用.md`。
- **同步审阅与回归修复（本机全仓复核闭环）**：
  - 修复 `auth-contexts.ts.tpl` 中 `browser.newContext()` 未透传 `{ baseURL }` 导致相对路径请求报 `Invalid URL` 的阻塞缺陷；
  - `eslint.config.mjs.tpl` `ignores` 新增 `playwright-report`、`docs/evidence/playwright-report`、`test-results`，防止生成报告后 `npm run check` 误报失败；
  - `vite.config.ts.tpl` `/api` 代理统一为 `http://127.0.0.1:3001`（与 `playwright.config.ts` 一致），避免 Node 20 `localhost` IPv6 解析偏差；
  - `github-actions-ci.yml` 在 `Gate 3d-2` 前补加幂等 `npm run db:seed`，防止 `Gate 3b` 脏写影响 E2E；
  - `verify-gates.mjs` Gate 2 新增拦截 Playwright `test.fixme` / `describe.fixme`；同步全套 `templates/T01~T13.md` 至 `v1.2.0`。

## 1.1.0 — 2026-11-26（全生命周期完整版：补齐 P2+P3 全部 4 项生产部署、协作、可观测性与业务底座）

- **G-06（P2）：新增 S8 生产容器化部署、自动 HTTPS、健康探针与备份恢复包（`规范文件/deploy/`，新增规则 `STD-OPS-07`）**：
  - 新增多阶段非 root `Dockerfile`（`USER node` + 内置 `/healthz` HEALTHCHECK）、内网隔离 PostgreSQL 16 的 `docker-compose.prod.yml`（严禁暴露 5432 公网端口）、自动签发 HTTPS 证书与安全头的 `Caddyfile`、`/healthz`（存活）+ `/readyz`（PostgreSQL `SELECT 1` 就绪）的 `health-probes.ts.tpl`，以及跨平台 `backup-postgres.mjs`（`--backup` 生成 `.sql` + `.sha256`、`--restore <file> --confirm-restore` 强制摘要核验与双确认熔断，含 `--self-check`）。
- **G-07（P2）：新增多人协作本地 Pre-commit 钩子与 PR 审查清单（新增规则 `STD-CODE-12`）**：
  - 新增 `规范文件/ci/pre-commit.hook`（提交前自动刷新 `PROJECT_INDEX_TREE.md` 并执行 Gate 2/1 本地快检）与 `规范文件/ci/pull_request_template.md`（覆盖 `REQ/AC`、CI Gate 1–4 + SHA-256 指纹、黑盒验真截图与 Prisma Studio、Prisma 迁移先 rebase 主干规范、D0/D1 高风险独立审计签字）；`package.json.tpl` 新增 `hooks:install` 与 `prepare` 一键启用。
- **G-08（P2）：新增 Pino 结构化脱敏日志、`x-request-id` 追踪与异常指纹中间件（新增规则 `STD-OPS-08`）**：
  - 新增 `规范文件/starter/templates/logger-trace.ts.tpl`（基于 Pino，强制将 `password/token/authorization/cookie/secret` 等敏感字段脱敏为 `[REDACTED]`，自动透传/生成 `x-request-id`，并提供 16 位十六进制 `computeErrorFingerprint` 与 `logUnhandledError` 异常聚类）。
- **G-09（P3）：新增团队统一品牌 Design Token 与对象存储/异步任务基线（新增规则 `STD-FE-07`、`STD-DAT-05`）**：
  - 新增 `规范文件/starter/templates/theme.css.tpl`（Tailwind CSS v4 `@theme` + Preline 品牌色、WCAG AA 语义状态色、圆角、`:focus-visible` 与 `prefers-reduced-motion`），彻底杜绝 AI 生成默认模板风。
  - 新增 `规范文件/contracts/storage-jobs-baseline.md`（S3/OSS 预签名直传 + MIME/魔数校验 + 私有桶 RBAC 下载；异步/定时任务 `jobKey` 唯一幂等键 + `lockedUntil` 租约锁 + 指数退避与死信状态）。
- **脚手架升级与全套同步（有效规则总计 124 条）**：`starter/init-project.mjs` 升级至 25 项映射（一键生成 26 个文件含 `.gitignore` 并自动赋予 `.githooks/pre-commit` 可执行权限）；`verify-gates.mjs --self-check` 级联校验 `backup-postgres.mjs`；同步更新 `00`–`08`、`INDEX_TREE.md`、`templates/T01~T13`、`SKILL.md`、`AGENTS.md`、`开始使用.md`，归档 `v1.0.0-baseline.zip` 与 `审计报告_v1.0.md`，形成 `审计报告_v1.1.md`。

## 1.0.0 — 2026-11-26（正式试点版：补齐 P0+P1 全部 5 项工程化底座）

- **G-01（P0 技术隐患修复）：前后端同构契约与服务端指纹物理分离**：
  - 移除 `规范文件/contracts/base-contract.schema.ts` 中的 `node:crypto` 导入，确保 React + Vite 前端零构建报错；新增 `规范文件/contracts/fingerprint.server.ts` 承载 Node.js 同步 `computePayloadFingerprint`，并在 Gate 2 中加入静态扫描防止浏览器源码误引。
- **G-02（P1）：新增黄金技术栈一键初始化脚手架（`规范文件/starter/`）**：
  - 新增 `init-project.mjs` 与 9 份标准模板（`package.json`、`tsconfig.json`、`vite.config.ts`、`eslint.config.mjs`、`.env.example`、`schema.prisma`、`seed.ts`、`usePrelineInit.ts`、`auth-rbac.ts`），1 条命令生成 React 19 + Preline UI（含 SPA 路由初始化 Hook）+ Hono + PostgreSQL 16 + 索引树 + 四道门禁的完整底座。
- **G-03（P1）：升级 CI Gate 1 实现 `docs/` ↔ `tests/` 双向 `REQ/AC` 覆盖核对**：
  - 升级 `规范文件/ci/verify-gates.mjs`，自动扫描 `docs/` 中声明的全部 `REQ-xxx` 与 `AC-xxx` 并与 `tests/` 的 `@req/@ac` 标签做差集比对，漏测任何一个 `AC` 或引用幽灵编号即刻阻断合并。
- **G-04（P1）：新增认证、可吊销会话与三层 RBAC 权限底座（新增规则 `STD-SEC-05`）**：
  - 新增 `contracts/auth-rbac-baseline.md` 与 `starter/templates/auth-rbac.ts.tpl`（`scrypt` 强哈希、PostgreSQL 可吊销 `Session` 表、`HttpOnly; SameSite=Lax` Cookie、三层 RBAC 拦截）；Gate 2 自动拦截前端 `localStorage` 存储敏感令牌。
- **G-05（P1）：新增合成测试种子账号工厂与一键重置（新增规则 `STD-QA-14`）**：
  - 新增 `starter/templates/seed.ts.tpl`（预置 `ADMIN`/`HANDLER`/`MEMBER_A`/`MEMBER_B` 合成测试账号 + `NODE_ENV=production` 安全熔断）与 `npm run db:reset` 命令，支撑零经验成员 30 秒开启双无痕窗口黑盒越权验真。
- **同步规则、模板、索引树与 Skill（有效规则总计 119 条）**：更新 `00`–`08`、`INDEX_TREE.md`、`templates/T01~T13`、`SKILL.md`、`AGENTS.md` 与 `开始使用.md`，归档 `v0.9.1-baseline.zip` 与 `审计报告_v0.9.md`，形成 `审计报告_v1.0.md`。

## 0.9.1 — 2026-11-26

- **新增“双索引树”自动生成与门禁联动机制（有效规则增至 117 条）**：
  - 新增规则 `STD-GOV-05`（项目资产语义索引树自动生成与首读纪律）：要求 AI 创建源码/契约/测试文件时在前 12 行写 `// @desc 一句话中文职责 | @req/@ac/@api/@comp`，每次新开会话先读 `PROJECT_INDEX_TREE.md` 防止跨会话失忆与重复造轮子，提交前自动刷新索引树。
  - 新增零依赖可执行脚本 `规范文件/ci/build-index-tree.mjs`：自动扫描项目目录、提取 `@desc/@req/@ac/@api/@comp` 标签、导出符号与 Prisma Model，生成 `PROJECT_INDEX_TREE.md` 与 `docs/index-tree.json`，并支持 `--check` 新鲜度校验。
  - 增强 `规范文件/ci/verify-gates.mjs`：Gate 1 自动执行索引树新鲜度校验；Gate 2 补齐对 `.vue` 文件及 `package.json` 禁用旧技术栈依赖（`vue`/`element-plus`/`naive-ui`/`sqlite`/`uni-app`/`capacitor`）的真实拦截扫描。
  - 新增工作流自身一屏跳转树 `规范文件/INDEX_TREE.md`：标注 `01_规则库.md` 20 个分节精确行号与常见场景一跳表，大幅降低 AI 读规上下文开销。
  - 同步更新 `00_主流程.md`、`02_模板包.md`（及 `templates/` 13 份独立模板）、`04_AI项目执行说明.md`、`06_工程质量与审计验收基线.md`、`SKILL.md`、`stage-routing.md`、`AGENTS.md` 与 `开始使用.md`，并归档 `v0.9.0-baseline.zip`。

## 0.9.0 — 2026-11-17

- **全面技术栈与工程闭环升级（落实 8 项改造方案 + 移动端双模式）**：完成对 0.8.0 的全面工程化升级，使零开发经验团队从“有规范”迈向“可强制自动校验的工程闭环”（详见 `审计报告_v0.9.md`）。
- **黄金技术栈全面切换与收敛（`STD-ARC-09`、`STD-REACT-01~04`、`05`、`06`、`08`）**：
  - Web 前端由 Vue 3 + Element Plus/Naive UI 全面切换为 **React 18/19 + TypeScript (`strict`) + Vite + Tailwind CSS + Preline UI（或按需采用 Meta StyleX/Lexical 生态）+ Zustand / TanStack Query**；原 `STD-VUE-01~04` 正式标为弃用，替换为 `STD-REACT-01~04`。
  - 数据库彻底**废除 SQLite**，统一采用 **PostgreSQL 16 + Prisma ORM**，并在 `规范文件/ci/docker-compose.postgres.yml` 提供与 CI/生产 100% 同构的本地一键容器。
  - 移动端彻底移除 `uni-app` 与 `Capacitor`，并在 `08_移动App专项.md` 与 `T13` 重构为**双模式**：**模式 A（默认常规：既有 App 修改优化与通用契约对接）** + **模式 B（条件调用：明确立项从 0 新建 App 时才调用，优先评估 React Native + TS 或原生方案）**。
- **新增代码级工程基础设施与 4 条核心规则（有效规则总计 116 条，来源总计 50 组）**：
  - 新增 `规范文件/contracts/` **通用契约包基线**（`base-contract.schema.ts`、`openapi-baseline.yaml`）与规则 `STD-API-07`，统一响应信封、RFC 9457 错误码枚举、分页与乐观锁契约。
  - 新增 `规范文件/ci/` **四道自动化硬门禁流水线**（`github-actions-ci.yml`、`verify-gates.mjs`）与规则 `STD-QA-13`，在 CI 自动拦截无 `@req/@ac` 标签代码、SQLite 混用、`.skip`/`.only`、空 `catch {}` 及指纹漂移。
  - 强化**需求（REQ）↔ 验收条件（AC）↔ 带 `@req/@ac` 标签先行测试（RED）↔ 编码实现（GREEN）↔ 指纹回填闭环**（更新 `STD-GOV-03`、`STD-QA-01`、`T03`、`T07`、`T08`）。
  - 新增**三重指纹规则**：接口幂等载荷 SHA-256 指纹 `STD-API-08`（同 `requestId` 不同载荷返回 `409 IDEMPOTENCY_FINGERPRINT_MISMATCH`）与契约/Schema/锁文件/证据 SHA-256 指纹锁 `STD-AUD-07`（上游变 1 字节即刻失效为 `Stale`）。
- **同步模板、案例与 Skill**：更新 `T01~T13` 并重新生成 `templates/` 单文件；更新 `03_贯穿案例_工单.md` 为 PostgreSQL Prisma + `contracts` 契约 + React/Preline 组件 + `@req/@ac` Vitest 测试 + 指纹锁定示范；同步更新 `.agents/skills/fullstack-product-delivery/` 与 `AGENTS.md`；归档 `v0.8.0-baseline.zip`。

## 0.8.0 — 2026-11-16

- 针对“零开发经验团队”补齐 6 项落地断层：新增 `STD-ARC-09`（黄金栈）、`STD-CODE-11`（Git 快照救生）、`STD-QA-12`（黑盒可观察验真法与高风险独立复核门禁）；修订 `STD-REQ-01`（指令型需求直入 S2）。
- 拆分 `templates/T01~T13` 独立模板；封装 `.agents/skills/fullstack-product-delivery/`；隔离历史归档包至 `历史归档_勿喂给AI/`。

## 0.7.0 — 2026-11-14

- 新增 `08_移动App专项.md`、16 条 `STD-MOB-*` 规则及 `T13`；总计 109 条规则、13 份模板、44 组来源。

## 0.6.0 — 2026-11-14

- 新增修改型前端视觉继承与明确改版放行规则（`FE-05/06`、`API-06`、`QA-10/11`），总计 93 条规则。

## 0.5.0 — 2026-11-14

- 新增 `07_项目推进与多agent执行.md` 及 8 条 `STD-FLOW-*` 规则，总计 88 条规则。

## 0.4.0 — 2026-11-14

- 新增 `06_工程质量与审计验收基线.md` 与 `T12` 审计验收包，新增 24 条规则，总计 80 条规则。

## 0.3.0 — 2026-11-14

- 将“本步能力”改为“本步目标”，移除默认教学与能力考核，架构判断嵌入项目任务。

## 0.2.0 — 2026-11-14

- 确立全栈产品设计师贯通所有适用阶段的工作方式，取消专业岗位拆分与交接。

## 0.1.0 — 2026-11-14

- 初版建立 10 阶段 S0–S9、56 条规则、11 份模板与贯穿案例。
