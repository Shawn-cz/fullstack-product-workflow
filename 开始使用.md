# 开始使用：软件产品设计与全栈交付工作流

交付版本：1.1.0（全生命周期完整版）｜整理日期：2026-11-26｜形式：内置 Antigravity Skill（`.agents/skills/` + `AGENTS.md`）、S0–S8 全生命周期一键脚手架（`starter/`）、双索引树（`INDEX_TREE.md` + `build-index-tree.mjs`）、前后端同构契约/RBAC/存储与异步任务基线（`contracts/`）、本地 Pre-commit 与双向闭环 CI 四道硬门禁（`ci/`）、S8 生产容器/HTTPS/备份包（`deploy/`）及可跨工具使用的 Markdown 规范包。

专为**零开发工作经验的全栈产品设计团队**打造，覆盖 Web、后端接口、移动 App（既有 App 修改对接 / 条件从 0 新建 App）及生产容器运维上线。当前含 **10 阶段、124 条有效规则、13 份独立模板、一键全生命周期脚手架（25 项映射生成 26 文件，含品牌主题、RBAC、4 角色测试种子、Pino 脱敏日志、Pre-commit/PR 模板与 S8 生产部署包）、50 组官方来源**及工单设计案例。

## 1. 拿到文件后如何开始

### 模式 A：从 GitHub 公开仓库通过 AI 一键启动（团队最推荐）
成员在本地打开新建的空项目目录，直接把下面这段话发给 Antigravity 中的 AI：
> 请从我们团队的 GitHub 标准仓库 `https://github.com/Shawn-cz/fullstack-product-workflow.git` 获取最新的工作流文件：将里面的 `.agents`、`AGENTS.md`、`规范文件` 和 `开始使用.md` 复制到当前项目根目录（删除克隆带过来的 `.git` 文件夹，断开与原模板库的远程关联），然后立即激活 `fullstack-product-delivery` 技能。若是新建全栈项目，先运行 `node 规范文件/starter/init-project.mjs --target .` 初始化全生命周期底座并执行 `npm run hooks:install` 启用本地防呆钩子，协助我启动本次任务：
> **[在这里写你要做的产品需求或功能]**

### 模式 B：本地压缩包解压或其他 AI 工具
1. 将 `.agents/`、`AGENTS.md` 和 `规范文件/` 复制到项目根目录，**切勿将 `历史归档_勿喂给AI/` 拖入 AI 聊天窗**。
2. 网页端可复制下方第 4 节启动说明，连同 `规范文件/00_主流程.md`、`规范文件/04_AI项目执行说明.md` 发送给 AI。

## 2. 团队默认黄金技术栈与全生命周期工程基座（S0–S8）

新建项目无既有仓库强约束时，运行 **`node 规范文件/starter/init-project.mjs --target .`** 即可一键铺齐以下底座（**严禁使用 Vue、SQLite、Element Plus、Naive UI、uni-app 或 Capacitor**）：

| 层级 | 团队统一默认技术栈 | 零经验成员防呆与黑盒验真配套 |
|---|---|---|
| **Web 前端与品牌主题** | **React 19 + TypeScript (`strict`) + Vite + Tailwind CSS + Preline UI**（`usePrelineInit` + `src/styles/theme.css` 品牌 Token `STD-FE-07`；或按需 Meta StyleX/Lexical）+ Zustand / TanStack Query | 浏览器实际渲染对照、`tsc --noEmit`；前端只导入同构 `base-contract.schema.ts`；拒绝散落写死色值 |
| **后端、契约、RBAC 与日志** | **Node.js (LTS) + Hono / Fastify + TypeScript + Zod + Pino**（同构契约与 `fingerprint.server.ts` 物理分离）+ **PostgreSQL 可吊销 `Session` + `HttpOnly` Cookie + 三层 RBAC** + `logger-trace.ts` | 严禁 `localStorage` 存令牌（Gate 2 自动拦截）；F12 Network 核对 `401/403/404/409`；日志自动脱敏并带 `requestId` 与 `errorFingerprint` |
| **数据库、种子与存储/任务** | **PostgreSQL 16 + Prisma ORM**（`npm run db:up` 同构容器；**禁用 SQLite**）+ `prisma/seed.ts`（预置 `ADMIN`/`HANDLER`/`MEMBER_A`/`MEMBER_B` 合成账号，含生产熔断）+ 对象存储与异步任务基线 | `npm run db:reset` 30 秒还原测试账号供双无痕窗口越权验证；`npm run db:studio` 可视化查库；大文件走 S3/OSS 预签名直传，`jobKey` 防重入 |
| **移动 App（双模式）** | **模式 A（常规）**：既有 App 修改优化并对接 `contracts/openapi-baseline.yaml`<br>**模式 B（条件：明确从 0 新建）**：优先 **React Native + TS** 或原生 | 模式 A 严格继承原工程风格；模式 B 才调用新建与提审分支 |
| **索引树、协作门禁与指纹** | **自动语义索引树**（`npm run index:build`）+ **本地 `.githooks/pre-commit` & PR 审查模板**（`npm run hooks:install`）+ **双向闭环四道门禁**（`npm run gates`）+ **三重 SHA-256 指纹锁** | 提交前本地自动拦违规；漏测 `AC`、未刷索引树、误用禁用栈或契约变动均自动阻断 |
| **S8 生产部署与备份恢复** | **`deploy/` 生产基线**：非 root 多阶段 `Dockerfile` + 内网隔离 `docker-compose.prod.yml` + `Caddyfile` 自动 HTTPS + `/healthz`/`/readyz` 探针 + `backup-postgres.mjs` | 变更前运行 `npm run db:backup` 自动生成 `.sql` + `.sha256`；恢复强制双确认与摘要核验 |

## 3. 日常执行入口与工具包导航

| 需要做的事 | 打开哪个文件 / 目录 |
|---|---|
| 一键初始化新项目全生命周期底座（脚手架） | [规范文件/starter/](规范文件/starter/README.md)（`init-project.mjs`） |
| 一键触发 AI 技能与工作区规则 | [SKILL.md](.agents/skills/fullstack-product-delivery/SKILL.md) / [AGENTS.md](AGENTS.md) |
| 一屏定位 124 条规则行号、模板与工具包 | [工作流索引树](规范文件/INDEX_TREE.md) |
| 同构契约基线、RBAC 权限与对象存储/异步任务基线 | [规范文件/contracts/](规范文件/contracts/README.md)（含 [auth-rbac-baseline.md](规范文件/contracts/auth-rbac-baseline.md)、[storage-jobs-baseline.md](规范文件/contracts/storage-jobs-baseline.md)） |
| 自动索引树、Pre-commit/PR 模板、PostgreSQL 容器与双向 CI 门禁 | [规范文件/ci/](规范文件/ci/README.md) |
| S8 生产 Docker/Caddy HTTPS/健康探针/备份恢复包 | [规范文件/deploy/](规范文件/deploy/README.md) |
| 判断阶段、ATDD 闭环与三级裁剪 | [00 主流程](规范文件/00_主流程.md) |
| 查具体设计与工程规则（124 条） | [01 规则库](规范文件/01_规则库.md) |
| 按阶段取用轻量单文件模板（`T01`–`T13`） | [规范文件/templates/](规范文件/templates/T01_项目启动与裁剪卡.md)（全集见 [02 模板包](规范文件/02_模板包.md)） |
| 看闭环 `AC`、PostgreSQL Schema、Preline 组件与指纹样本 | [03 工单案例](规范文件/03_贯穿案例_工单.md) |
| Git 救生、黑盒验真法、CI 门禁、部署运维与指纹防伪详解 | [06 质量基线](规范文件/06_工程质量与审计验收基线.md) |
| 既有 App 对接与条件新建 App 双模式 | [08 移动专项](规范文件/08_移动App专项.md) + [T13](规范文件/templates/T13_移动App项目补充卡.md) |

## 4. 网页端/跨工具备用启动说明

> 请使用《软件产品设计与全栈交付工作流 v1.1.0》协助我推进实际项目。
>
> 本次任务：[填写要解决的问题或要开发/修改的功能]。
> 需求性质：[团队负责人明确指令（直接登记 DEC 进 S2，免外部访谈） / 探索型需求]。
> 产品类型：[Web / 既有 App 修改与接口对接 / 从 0 新建 App / 多端]。
> 本轮交付终点：[设计 / 原型 / 可运行软件 / 已获授权范围内的生产发布]。
>
> 先读取 `规范文件/INDEX_TREE.md`、`规范文件/00_主流程.md` 与 `规范文件/04_AI项目执行说明.md`（已有项目首读 `PROJECT_INDEX_TREE.md`），按阶段只读取 `规范文件/templates/` 对应单文件模板。新建项目优先运行 `node 规范文件/starter/init-project.mjs --target .` 并执行 `npm run hooks:install`，铺齐 **React 19 + TS + Preline UI（`theme.css`）+ Node.js + Pino 脱敏日志 + Prisma + PostgreSQL 16 + RBAC + 种子账号 + 双向 CI/Pre-commit + S8 Docker/Caddy/备份** 底座（严禁 SQLite/Vue/uni-app/Capacitor，严禁前端导入 `node:crypto` 或用 `localStorage` 存令牌）。
>
> 执行强制 **“需求 `REQ` → 结构化 `AC` → 全覆盖 `@req/@ac` 先行测试（RED）→ 编码实现（GREEN）→ 刷新索引树 + `npm run gates` + SHA-256 指纹锁”** 闭环；由你代管分支与 Git 快照；每次实现后结合 `prisma/seed.ts` 测试账号输出 3–5 步零经验成员可操作的黑盒验真步骤。触及 D0/D1 权限资金、数据迁移或 S8 生产发布时，提醒我执行备份 `.sha256` 并发起独立审计会话或团队负责人复核。

## 5. 验证与历史归档材料

- [1.1.0 全生命周期完整版审计与校验报告](规范文件/审计报告_v1.1.md)：P2+P3 四项工程与生产底座（G-06 至 G-09）闭环落地与端到端实测验证。
- [当前验证记录](规范文件/验证记录.md) 与 [文档检查结果](规范文件/文档检查结果.json)。
- [版本变更](规范文件/CHANGELOG.md)、[体系结构](规范文件/ARCHITECTURE.md)、[项目交接](规范文件/session_handoff.md)、[交付文件清单](交付文件清单.json)。
- 历史版本基线包（0.5–1.0.0）与旧审计报告已隔离至 [历史归档_勿喂给AI/](历史归档_勿喂给AI/README_归档说明.md)。
