# 团队全栈产品设计与交付工作区规则 (v1.2.0 全生命周期完整版)

本工作区启用《软件产品设计与全栈交付工作流 v1.2.0》（面向零开发经验全栈团队）。当处理任何产品需求、界面设计、代码开发、移动对接、缺陷修复、多人 PR 协作、生产部署或项目审计任务时，请激活并遵循 `.agents/skills/fullstack-product-delivery/SKILL.md` 技能，并遵守以下核心纪律：

1. **双索引树首读、新项目一键脚手架，严禁读取历史归档包（`STD-GOV-05`）**：
   - 已有业务项目**新开会话先读 `PROJECT_INDEX_TREE.md`**（禁止盲目全仓翻找或重复造轮子）；改完代码立即运行 `npm run index:build` 刷新索引树，新建业务文件前 12 行写 `// @desc 中文职责 | @req/@ac/@api/@comp`。
   - 新建全栈项目优先运行 `node 规范文件/starter/init-project.mjs --target .` 一键落地 29 项 S0–S8 全生命周期底座（黄金栈、品牌主题 Token、同构契约、RBAC 中间件、Pino 脱敏日志、健康探针、4 角色测试种子与 Playwright 双账号越权上下文底座、Pre-commit/PR 模板、CI 与生产部署包），随后运行 `npm run hooks:install` 启用本地门禁钩子。
   - 查阅工作流规范先看 `规范文件/INDEX_TREE.md` 按行段切片读取；按阶段仅读取 `规范文件/templates/T01~T13` 单文件模板；**严禁加载 `历史归档_勿喂给AI/`**。
2. **团队默认黄金技术栈、品牌 Token 与同构契约分离（`STD-ARC-09` / `STD-FE-07` / `STD-API-07/08`）**：
   - **Web 前端**：`React 19 + TypeScript (strict) + Vite + Tailwind CSS + Preline UI`（内置 `usePrelineInit` 路由 Hook 与 `src/styles/theme.css` 品牌 Token，或按需 Meta StyleX/Lexical 生态）`+ Zustand / TanStack Query`。**严禁在组件内散落写死色值，严禁浏览器端导入 `node:crypto` 或 `fingerprint.server.ts`**。
   - **后端与契约**：`Node.js (LTS) + Hono/Fastify + TypeScript + Zod + Pino`，前端只引同构 `shared/contracts/base-contract.schema.ts`，服务端同步载荷指纹引 `shared/contracts/fingerprint.server.ts`。
   - **数据库、存储与异步任务**：**统一使用 `PostgreSQL 16 + Prisma ORM`**（`npm run db:up` 同构容器），**严禁使用 SQLite**；提供 `prisma/test-accounts.ts` 纯数据账号清单 + `prisma/seed.ts` 预置 4 角色测试账号与 `npm run db:reset`（含 `NODE_ENV=production` 熔断保护，`STD-QA-14`）；文件上传与定时/异步任务遵循 `规范文件/contracts/storage-jobs-baseline.md`（S3/OSS 预签名直传 + `jobKey` 唯一幂等与租约锁，`STD-DAT-05`）。
   - **移动端（双模式，`STD-MOB-01`）**：默认走**模式 A（既有 App 修改优化与 `contracts/` 接口对接）**；仅明确立项从 0 新建 App 时才调用**模式 B（优先 React Native + TS 或原生）**。**严禁选用 Vue 3、Element Plus、Naive UI、uni-app 或 Capacitor。**
3. **认证会话与三层 RBAC 红线（`STD-SEC-05`）**：
   - Web 会话强制使用 PostgreSQL 可吊销 `Session` 表 + `HttpOnly; SameSite=Lax` Cookie（或签名校验的企业 SSO），**严禁将登录令牌存入 `localStorage`**；服务端严格执行“认证 401 → 角色 403 → 数据范围 404/过滤”三层拦截。
4. **双向闭环、本地 Pre-commit、四道硬门禁与三重 SHA-256 指纹（`STD-GOV-03` / `STD-CODE-12` / `STD-QA-01` / `STD-QA-13` / `STD-AUD-07`）**：
   - 先拆结构化 `AC-xxx`，再写覆盖 `docs/` 中全部 `REQ`/`AC` 的 `@req/@ac` 先行测试（RED），再编码转绿（GREEN）并跑通 `.githooks/pre-commit` 与 `npm run gates`（Gate 1 核对 `docs/`↔`tests/` 双向覆盖差集与索引树新鲜度；Gate 2 拦截 `.skip`/`.only`/空 `catch`/`localStorage` 存令牌/禁用旧栈；Gate 4 校验三重指纹防过期）；多人协作走特性分支 + `.github/pull_request_template.md`。
5. **指令型需求直入 S2、Git 快照救生、Playwright 自动越权与 S8 生产部署运维（`STD-REQ-01` / `STD-CODE-11` / `STD-QA-12` / `STD-OPS-07` / `STD-OPS-08`）**：
   - 负责人明确指令凭 `DEC` 直入 `S2`；改码前建 Git 保存点；S6 基于 `tests/e2e/fixtures/auth-contexts.ts` 与 `starter/examples/rbac-isolation.spec.ts.example` 接入 Playwright 双上下文自动越权（`Gate 3d` / `npm run test:e2e:fresh` 自动校验 `401/403/404`、`HttpOnly` Cookie、会话吊销并生成 HTML 截图报告），人工只做 1–2 分钟业务界面验真与 `npm run db:studio` 查库；服务端统一接入 `server/middleware/logger-trace.ts`（Pino 脱敏日志 + `x-request-id` + `errorFingerprint`）；S8 生产部署直接使用 `Dockerfile` + `docker-compose.prod.yml`（内网隔离数据库）+ `Caddyfile`（自动 HTTPS）+ `/healthz`/`/readyz` 探针，变更前必跑 `npm run db:backup` 生成 `.sql` + `.sha256`；D0/D1 权限资金、数据迁移及 S8 发布强制走独立审计会话或负责人复核。
