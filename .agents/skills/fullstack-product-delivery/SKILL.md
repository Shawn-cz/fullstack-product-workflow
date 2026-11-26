---
name: fullstack-product-delivery
description: Use when starting, designing, implementing, modifying, verifying, deploying, or auditing any Web or mobile App feature, UI change, or bugfix under the team's full-stack product delivery workflow
---

# 软件产品设计与全栈交付工作流 (v1.2.0 全生命周期完整版)

## Overview

面向**零开发工作经验团队**的全栈产品设计与开发交付规范（S0–S9 全生命周期）。
**核心原则：** 成员负责业务决策与黑盒可观察验收；AI 负责**一键全生命周期脚手架铺底、项目索引树首读与刷新、同构契约与 RBAC 鉴权落地、品牌 Token 统一、测试先行（双向闭环）、代码实现与脱敏日志、Pre-commit/Git 快照救生、CI 四道硬门禁校验及 S8 生产容器部署与备份**。**违反规则字面要求即违反规则精神。**

## When to Use

- 启动新产品、新功能迭代、已有界面修改优化、文件上传与异步任务设计、既有移动 App 接口对接/从 0 新建 App、缺陷修复、多人 PR 协作或 S8 生产上线部署
- 将模糊业务想法转化为需求与结构化验收条件（T03 `REQ/AC`）、业务状态与权限（T04）、同构契约/RBAC/存储与任务架构（T05/`contracts/`）、React/Preline 品牌界面（T06/`theme.css`）、先行测试与指纹验收（T07/T12/`ci/`）及生产容器运行卡（T09/`deploy/`）

## 团队默认黄金技术栈与全生命周期底座（STD-ARC-09 / STD-SEC-05 / STD-OPS-07 / STD-OPS-08）

新建项目无既有仓库强约束时，**优先运行 `node 规范文件/starter/init-project.mjs --target .` 一键初始化 29 项全生命周期底座**（严禁擅自选用 Vue、SQLite、Element Plus、Naive UI、uni-app 或 Capacitor）：

| 层级 | 默认黄金技术栈 | 零经验成员配套与防呆 |
|---|---|---|
| **一键初始化脚手架** | [starter/init-project.mjs](../../../规范文件/starter/init-project.mjs) | 1 条命令铺齐前端/后端配置、`theme.css`、`schema.prisma`、`test-accounts.ts`、`seed.ts`、`playwright.config.ts`、`auth-contexts.ts`、`usePrelineInit`、`auth-rbac`、`logger-trace`、`health-probes`、Pre-commit/PR 模板、CI 与 `deploy/` |
| **Web 前端与品牌主题** | **React 19 + TypeScript (`strict`) + Vite + Tailwind CSS + Preline UI**（`usePrelineInit` + `src/styles/theme.css` 品牌 Token `STD-FE-07`；或按需 Meta StyleX/Lexical）+ Zustand / TanStack Query | 浏览器实际渲染对照、`tsc --noEmit`；前端只导入同构 `base-contract.schema.ts`；禁止组件内写死品牌色值 |
| **后端、契约、RBAC 与可观测性** | **Node.js (LTS) + Hono / Fastify + TypeScript + Zod + Pino**（同构契约与 `fingerprint.server.ts` 物理分离）+ **PostgreSQL 可吊销 `Session` + `HttpOnly` Cookie + 三层 RBAC** + `logger-trace.ts` | 严禁 `localStorage` 存令牌；Playwright 自动核对 `401/403/404` 与 `HttpOnly` Cookie；所有日志自动脱敏并带 `requestId` 与 `errorFingerprint` |
| **数据库、种子与自动化越权** | **PostgreSQL 16 + Prisma ORM**（`npm run db:up` 同构容器；**严禁 SQLite**）+ `prisma/test-accounts.ts` & `seed.ts`（4 角色合成账号，含生产熔断）+ [storage-jobs-baseline.md](../../../规范文件/contracts/storage-jobs-baseline.md) | `npm run test:e2e:fresh` 自动清库灌种子并用双隔离上下文跑完越权与会话吊销（输出 HTML 报告）；`npm run db:studio` 可视化查库；大文件走 S3/OSS 预签名直传 |
| **移动 App** | **模式 A（默认常规）**：既有 App 修改优化并对接 `contracts/openapi-baseline.yaml`<br>**模式 B（条件调用：明确从 0 新建）**：优先评估 **React Native + TS** 或原生 | 模式 A 严格继承原工程风格与架构；模式 B 才走完整新建与首次上架流程 |
| **索引树、本地钩子、CI 与生产部署** | [build-index-tree.mjs](../../../规范文件/ci/build-index-tree.mjs) + [verify-gates.mjs](../../../规范文件/ci/verify-gates.mjs) + `.githooks/pre-commit` + [deploy/](../../../规范文件/deploy/README.md) | 自动语义索引树 + **`docs/`↔`tests/` 双向 `REQ/AC` 覆盖** + 本地 Pre-commit 快检 + S8 非 root Docker/Caddy HTTPS/探针与 `.sha256` 备份脚本 |

## 执行步骤与按需加载（Progressive Disclosure）

**禁止一次性加载全部模板或历史归档文件（`历史归档_勿喂给AI/`）。** 按当前阶段仅加载所需文件：

1. **先读两棵索引树，再判路径与模式（STD-GOV-05）**：
   - 已有业务项目**第一步必须先读 `PROJECT_INDEX_TREE.md`**（若不存在运行 `npm run index:build` 生成），查清已有模块/组件/接口/数据表，严禁盲搜或重复造轮子；
   - 查阅工作流规则优先用 [INDEX_TREE.md](../../../规范文件/INDEX_TREE.md) 按行段切片读取，并结合 [stage-routing.md](./references/stage-routing.md) 判断裁剪路径、需求性质（探索型 vs 指令契约型 `STD-REQ-01`）与移动模式（模式 A 既有对接 vs 模式 B 从 0 新建）。
2. **新项目先用脚手架铺底，按阶段只读单文件模板**：从 [规范文件/templates/](../../../规范文件/templates/) 读取当前阶段对应的 `T01`–`T13` 独立模板；新建项目直接调用 [starter/init-project.mjs](../../../规范文件/starter/init-project.mjs) 并运行 `npm run hooks:install` 启用本地 `.githooks/pre-commit`（`STD-CODE-12`）。
3. **严格执行“需求 → 验收 → 测试 → 编码”双向闭环（STD-GOV-03 / STD-QA-01 / STD-QA-13）**：
   - 先在 `docs/`（T03）写出需求 `REQ-xxx` 及结构化 `AC-xxx`（Given/When/Then）；
   - 再在 S6 写出绑定 `// @req REQ-xxx @ac AC-xxx` 标签的测试骨架（须覆盖 `docs/` 中每一个 `REQ`/`AC`，Gate 1 自动做差集核对）并先运行确认 `RED`；若功能涉及登录、角色或受保护资源，必须基于 `tests/e2e/fixtures/auth-contexts.ts` 与 [rbac-isolation.spec.ts.example](../../../规范文件/starter/examples/rbac-isolation.spec.ts.example) 在 `tests/e2e/` 编写带 `@req/@ac` 标签的 Playwright 多角色越权验收用例；
   - 最后编写业务代码转 `GREEN`；新建文件前 12 行写 `// @desc 中文职责 | @req/@ac/@api/@comp`；界面样式复用 `src/styles/theme.css` Token（`STD-FE-07`），服务端接入 `server/middleware/logger-trace.ts`（`STD-OPS-08`）。
4. **改码前建分支与 Git 保存点，闭环后刷新索引树（STD-CODE-11 / STD-CODE-12 / STD-GOV-05）**：改码前运行 `git status` 建保存点与独立特性分支；每跑通一个小闭环立即运行 `npm run index:build` 刷新索引树并存 Git 快照；连续两次修不好立即回退快照；多人协作按 `.github/pull_request_template.md` 合并且 Prisma 迁移先 rebase `main`。
5. **运行四道硬门禁、Playwright 自动越权、三重指纹与 S8 生产基线（STD-QA-12~14 / STD-AUD-07 / STD-OPS-07）**：
   - 跑通 `npm run gates && npm run check && npm test`（Gate 1 双向覆盖+索引树+禁 SQLite；Gate 2 防作弊+前端禁 `node:crypto` 与 `localStorage` 存令牌+禁旧栈；Gate 3 PostgreSQL 测试与 Gate 3d Playwright 自动越权；Gate 4 三重指纹）；
   - 已配置 `tests/e2e/*.spec.ts` 时运行 `npm run test:e2e:fresh` 自动验证 `401/403/404` 越权、`member_a`/`member_b` 隔离、`HttpOnly` Cookie 与会话吊销并生成 HTML 报告，仅需输出 1–2 分钟人工业务体验与 `npm run db:studio` 验真清单（尚未到 E2E 阶段时附手工双无痕窗口步骤）；
   - S8 上线直接采用 `Dockerfile` + `docker-compose.prod.yml` + `Caddyfile` + `/healthz`/`/readyz` 探针，变更前必跑 `npm run db:backup` 生成 `.sql` + `.sha256`；
   - 触及 **D0/D1 权限资金、数据迁移（STD-DAT-04）或 S8 发布** 时，强制走**独立上下文交叉审计会话**或**团队负责人签字确认**。

## Rationalization Table（常见违规借口与反制）

| 常见借口 (Excuse) | 事实与强制处理 (Reality) |
|---|---|
| “把 `computePayloadFingerprint` 直接放进 `base-contract.schema.ts` 省事” | 违反 `STD-API-07`。React + Vite 前端一旦导入就会因 `node:crypto` 打包崩溃，必须物理隔离在 `fingerprint.server.ts`。 |
| “登录 Token 放 `localStorage` 前端好读取” | 违反 `STD-SEC-05`。易遭 XSS 窃取，Gate 2 直接拦截；必须用 PostgreSQL 可吊销 `Session` + `HttpOnly` Cookie。 |
| “`docs/` 写了 6 个 AC，我先测 1 个主流程就行” | 违反 `STD-QA-13`。Gate 1 自动解析 `docs/` 与 `tests/` 取差集，漏测任何一个 `AC` 都会阻断合并。 |
| “先用 SQLite / Vue / Element Plus / uni-app 写完再说” | 违反 `STD-ARC-09`。Gate 1/Gate 2 直接报错拦截，严禁混入禁用旧技术栈。 |
| “线上出了错我多打几个 `console.log(req.body)` 查一下” | 违反 `STD-OPS-08`。直接打印原始请求体会泄露密码与会话令牌；必须使用 `logger-trace.ts` Pino 脱敏日志与 `errorFingerprint`。 |
| “把上传文件直接存到容器本地 `./uploads` 目录最简单” | 违反 `STD-DAT-05`。容器重建即永久丢数据；必须走 S3/OSS 预签名直传与私有桶 RBAC 下载。 |
| “发布太急，跳过 `db:backup` 或直接把 5432 端口暴露给公网连一下” | 违反 `STD-OPS-07`。严禁生产数据库暴露公网端口，变更前必跑 `npm run db:backup` 生成 `.sha256` 校验并核验 `/readyz`。 |

## Red Flags - STOP and Check

- 准备在浏览器前端 `src/` 导入 `node:crypto` 或 `fingerprint.server`，或用 `localStorage` 存令牌
- 准备在组件里散落写死 Hex 品牌色而不使用 `src/styles/theme.css`，或手写 `console.log` 打印含敏感字段对象
- 准备把用户上传文件写入容器本地磁盘，或写无 `jobKey` 唯一幂等与租约锁的定时/后台任务
- 存在 `docs/` 声明了 `AC-xxx` 但测试文件里未覆盖，或修改源码后未运行 `npm run index:build`
- 涉及认证/RBAC/受保护资源但 S6/S7 未在 `tests/e2e/` 补齐带 `@req/@ac` 的 Playwright 多角色越权用例，或在 Playwright 用例中偷写 `.skip`/`.only`
- 发现 D0/D1 权限资金或 S8 发布未经过独立审计会话、备份 `.sha256` 演练或负责人复核就要标“已验收/发布”

## 每轮结束标准汇报格式

> **当前阶段**：[S…｜路径：完整/功能/小变更｜移动模式（如适用）：A对接 / B新建]
> **本轮成果与 Git 快照**：[修改的文件路径｜当前分支与快照 commit 哈希｜索引树已刷新]
> **四道门禁、Playwright 自动越权与指纹状态**：[Pre-commit / Gate 1–4 双向闭环与安全扫描结果｜Gate 3d 自动 `401/403/404`/`HttpOnly` Cookie/会话吊销及 HTML 报告路径｜契约与 Schema SHA-256 指纹摘要]
> **请您执行的黑盒业务验真（1–2 分钟）**：[1. 点开页面或 `npm run test:e2e:report` 核对核心业务界面、文案与截图（无需重复手工开双无痕窗口，除非尚未接 E2E） 2. 如需核库运行 `npm run db:studio` 查看 PostgreSQL 表记录（S8 另核验 `/healthz`、`/readyz` 与备份 `.sha256`）]
> **待决定/下一步**：[仅列影响业务结果或权限的必要问题，或下一具体动作]
