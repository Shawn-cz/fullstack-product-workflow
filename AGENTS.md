# 团队全栈产品设计与交付工作区规则 (v1.3.0)

本工作区启用《软件产品设计与全栈交付工作流 v1.3.0》。处理需求、界面、开发、移动对接、缺陷修复、PR 协作或生产部署任务时，请激活 `.agents/skills/fullstack-product-delivery/SKILL.md` 并遵守：

1. **双索引树首读与脚手架（`STD-GOV-05`）**：已有项目先读 `PROJECT_INDEX_TREE.md`，改码后运行 `npm run index:build`，新文件前 12 行写 `// @desc 中文职责 | @req/@ac/@api/@comp`。新建全栈项目运行 `node 规范文件/starter/init-project.mjs --target .` 生成 33 文件最小可运行底座并运行 `npm run hooks:install`。查规范先看 `规范文件/INDEX_TREE.md`，按阶段只读 `规范文件/templates/T01~T13` 单文件；**严禁加载 `历史归档_勿喂给AI/`**。
2. **黄金技术栈与同构隔离（`STD-ARC-09` / `STD-API-07` / `STD-FE-07`）**：前端 React 19 + TS strict + Vite + Tailwind v4 + Preline（`src/styles/theme.css` + `usePrelineInit`）+ Zustand/TanStack Query；后端 Node 20 + Hono + `@hono/node-server` + Zod + Pino（`logger-trace.ts` 脱敏）；数据库 PostgreSQL 16 + Prisma + `prisma/test-accounts.ts` & `seed.ts`（含生产熔断）。**严禁使用 Vue、SQLite、Element Plus、Naive UI、uni-app、Capacitor；严禁前端导入 `node:crypto`/`fingerprint.server`。** 移动端默认模式 A（既有 App 修改对接），仅明确新建时走模式 B（React Native + TS 或原生）。
3. **认证会话、三层 RBAC 与存储/任务基线（`STD-SEC-05` / `STD-DAT-05`）**：Web 使用 PostgreSQL 可吊销 `Session` + `HttpOnly; SameSite=Lax` Cookie，严禁 `localStorage` 存令牌；服务端执行 401→403→404/过滤三层拦截。大文件走 S3/OSS 预签名直传，异步/定时任务须带 `jobKey` 唯一幂等与租约锁（见 `contracts/storage-jobs-baseline.md`）。
4. **双向闭环、门禁边界与指纹锁定（`STD-QA-01/13` / `STD-AUD-07`）**：先写 `docs/` `REQ`/`AC`，再写覆盖全部 `REQ`/`AC` 的 `@req/@ac` 先行测试（RED），再实现转绿（GREEN）；涉认证/RBAC 必在 `tests/e2e/` 接入 Playwright 双上下文越权（`Gate 3d` / `npm run test:e2e:fresh`）。Gate 2 正则扫描为静态基线提醒，不替代运行时测试；验收通过后运行 `npm run gates:lock` 锁定契约/Schema/锁文件/源码树四重指纹。
5. **分支快照、S8 生产部署与高风险复核（`STD-CODE-11/12` / `STD-QA-12` / `STD-OPS-07`）**：负责人指令凭 `DEC` 直入 S2；改码前建分支与 Git 快照；S8 使用预编译 `Dockerfile` + `docker-compose.prod.yml`（统一 `--env-file .env.production`）+ `Caddyfile`，变更前运行 `npm run db:backup`；D0/D1 权限资金、数据迁移及 S8 发布须走独立上下文交叉审计或负责人复核。
