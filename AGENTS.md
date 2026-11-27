# 团队全栈产品设计与交付工作区规则 (v1.3.1)

本工作区启用《软件产品设计与全栈交付工作流 v1.3.1》。处理需求、界面、开发、移动对接、缺陷修复、PR 协作或生产部署任务时，请激活 `.agents/skills/fullstack-product-delivery/SKILL.md` 并遵守：

1. **双索引树首读与脚手架（`STD-GOV-05`）**：已有项目先读 `PROJECT_INDEX_TREE.md`，改码后运行 `npm run index:build`，新文件前 12 行写 `// @desc 中文职责 | @req/@ac/@api/@comp`。新建全栈项目运行 `node 规范文件/starter/init-project.mjs --target .` 生成 36 文件最小可运行底座（含 `.dockerignore`/`.gitattributes` 与 `/api/auth/*`）并运行 `npm run hooks:install`。查规范先看 `规范文件/INDEX_TREE.md`，按阶段只读 `规范文件/templates/T01~T13` 单文件；**严禁加载 `历史归档_勿喂给AI/`**。
2. **黄金技术栈与同构隔离（`STD-ARC-09` / `STD-API-07` / `STD-FE-07`）**：前端 React 19 + TS strict + Vite + Tailwind v4 + Preline（`src/styles/theme.css` + `usePrelineInit`）+ Zustand/TanStack Query；后端 Node 22 + Hono + `@hono/node-server` + Zod + Pino（`logger-trace.ts` 脱敏，业务路由挂 `api` 子容器）；数据库 PostgreSQL 16 + Prisma + `prisma/test-accounts.ts` & `seed.ts`。**严禁使用 Vue、SQLite、Element Plus、Naive UI、uni-app、Capacitor；严禁前端导入 `node:crypto`/`fingerprint.server`。** 移动端默认模式 A，仅明确新建走模式 B。
3. **认证会话、三层 RBAC 与存储/任务基线（`STD-SEC-05` / `STD-DAT-05`）**：Web 使用预置 `/api/auth/login|logout|me`（PostgreSQL 可吊销 `Session` + `HttpOnly; SameSite=Lax` Cookie），严禁 `localStorage` 存令牌；服务端执行 401→403→404/过滤三层拦截。大文件走 S3/OSS 预签名直传，异步任务须带 `jobKey` 唯一幂等与租约锁。
4. **双向闭环、门禁边界与指纹锁定（`STD-QA-01/13` / `STD-AUD-07`）**：先写 `docs/` `REQ`/`AC`，再写覆盖全部 `REQ`/`AC` 的 `@req/@ac` 先行测试（RED），再转绿（GREEN）；涉认证/RBAC 必在 `tests/e2e/` 接入 Playwright 越权（`npm run test:e2e:fresh`）。Gate 2 正则扫描为前置静态提醒，不替代运行时测试；验收通过后运行 `npm run gates:lock` 锁定四重指纹（已归一化 LF）。
5. **分支快照、S8 生产部署与高风险复核（`STD-CODE-11/12` / `STD-QA-12` / `STD-OPS-07`）**：负责人指令凭 `DEC` 直入 S2；改码前建分支与快照；S8 使用 `node:22` 预编译 `Dockerfile` + `docker-compose.prod.yml`（单 `.env.production`）+ `Caddyfile`，变更前运行 `npm run db:backup`；D0/D1 权限资金、数据迁移及 S8 发布须走独立上下文交叉审计或负责人复核。
