---
name: fullstack-product-delivery
description: Use when starting, designing, implementing, modifying, verifying, deploying, or auditing any Web or mobile App feature, UI change, or bugfix under the team's full-stack product delivery workflow
---

# 软件产品设计与全栈交付工作流 (v1.3.1)

面向**零开发经验团队**的 S0–S9 全栈交付规范。成员做业务决策与黑盒验真，AI 负责脚手架铺底、索引树维护、同构契约与 RBAC 落地、测试先行、编码与脱敏日志、Git 快照及门禁校验。

## 黄金技术栈与脚手架（STD-ARC-09 / STD-SEC-05）

新建项目先运行 `node 规范文件/starter/init-project.mjs --target .` 生成 36 文件最小可运行底座（含 `index.html`、`main.tsx`、`App.tsx`、`server/index.ts`、预置 `/api/auth/login|logout|me`、`auth-rbac`、Preline/主题、PostgreSQL 16 + Prisma、4 角色种子、Playwright Fixture、`.dockerignore`/`.gitattributes`、Pre-commit/CI 与 `node:22` 预编译 `Dockerfile`）。**禁用 Vue、SQLite、Element Plus、Naive UI、uni-app、Capacitor。**
- **前端**：React 19 + TS strict + Vite + Tailwind v4 + Preline（`src/styles/theme.css` + `usePrelineInit`）+ Zustand/TanStack Query；严禁前端导入 `node:crypto`/`fingerprint.server` 或用 `localStorage` 存令牌。
- **后端**：Node 22 + Hono + `@hono/node-server` + Zod + Pino（`logger-trace.ts` 脱敏）；业务路由挂在 `api` 子容器避免被 SPA 回退遮蔽；Web 使用 PostgreSQL 可吊销 `Session` + `HttpOnly` Cookie + 三层 RBAC（401→403→404/过滤）。
- **移动端（STD-MOB-01）**：默认**模式 A**（既有 App 修改优化与契约对接）；仅明确立项新建时调用**模式 B**（React Native + TS 或原生）。

## 按需加载与执行纪律

禁止一次性加载全部模板或 `历史归档_勿喂给AI/`。
1. **首读双索引树（STD-GOV-05）**：已有项目先读 `PROJECT_INDEX_TREE.md`；查规范先看 [INDEX_TREE.md](../../../规范文件/INDEX_TREE.md) 与 [stage-routing.md](./references/stage-routing.md)，按阶段只读 [templates/](../../../规范文件/templates/) 单文件。
2. **指令型直通 S2（STD-REQ-01）**：负责人明确指令凭 `DEC` 直入 S2，免外部访谈。
3. **ATDD 双向闭环（STD-QA-01 / STD-QA-13）**：先在 `docs/` 写 `REQ`/`AC`，再在 `tests/` 写带 `@req/@ac` 的先行测试（RED），再编码转绿（GREEN）；涉认证/RBAC 必补 `tests/e2e/*.spec.ts`（参照 [rbac-isolation.spec.ts.example](../../../规范文件/starter/examples/rbac-isolation.spec.ts.example)）。
4. **快照与本地门禁（STD-CODE-11 / STD-CODE-12）**：改码前建分支与 Git 快照，启用 `npm run hooks:install`；小闭环后运行 `npm run index:build && npm run gates && npm run check && npm run build`。
5. **自动越权、指纹锁定与高风险复核（STD-QA-12 / STD-AUD-07 / STD-OPS-07）**：
   - 运行 `npm run test:e2e:fresh` 自动验 `401/403/404`、`HttpOnly` Cookie 与会话吊销，验收通过后运行 `npm run gates:lock` 锁定四重指纹；
   - 注：Gate 2 正则扫描为静态基线提醒，不替代 Playwright 运行时测试与人工/独立审计；
   - 触及 D0/D1 权限资金、数据迁移或 S8 生产发布（`deploy/` 单 `.env.production` + 变更前 `npm run db:backup`），须走独立上下文交叉审计或负责人复核。

## 红线（触发即停）
- 前端 `src/` 引入 `node:crypto`/`fingerprint.server` 或 `localStorage` 存令牌
- `docs/` 有 `REQ`/`AC` 但测试未全覆盖，或测试中写 `.skip`/`.only`/`.fixme`
- 修改源码/契约后未刷新索引树或未重锁指纹；D0/D1/S8 未复核即标通过

## 每轮结束汇报
> **阶段/路径**：[S…｜完整/功能/小变更]｜**快照与索引**：[分支/commit｜索引树状态]
> **门禁与测试**：[Gate 1–4 / `npm run check` / `build` / `test:e2e:fresh` 实测结果｜指纹摘要]
> **成员黑盒核对（1–2 分钟）**：[业务页面核对 / `npm run test:e2e:report` / `npm run db:studio`]
> **待决定/下一步**：[仅列影响业务或权限的必要问题，或下一具体动作]
