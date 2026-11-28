# 开始使用：软件产品设计与全栈交付工作流

交付版本：1.4.0（安全加固与门禁防绕过闭环版）｜整理日期：2026-11-27｜形式：内置 Antigravity Skill（`.agents/skills/` + `AGENTS.md`）、S0–S8 最小可运行全栈脚手架（`starter/`）、双索引树（`INDEX_TREE.md` + `build-index-tree.mjs`）、前后端同构契约/RBAC/存储与任务基线（`contracts/`）、跨平台 Pre-commit/双向门禁与维护脚本（`ci/`）、S8 预编译生产容器/HTTPS/备份包（`deploy/`）及可跨工具使用的 Markdown 规范包。

专为**零开发工作经验的全栈产品设计团队**打造，覆盖 Web、后端接口、移动 App（既有 App 修改对接 / 条件从 0 新建 App）及生产容器运维上线。当前含 **10 阶段、124 条有效规则、13 份独立模板、一键最小可运行脚手架（37 项映射 + `.gitignore`/`.dockerignore`/`.gitattributes` 共生成 40 文件）、50 组官方来源**及工单设计案例。

## 0. 本机前置环境准备（首次使用必装）

零开发经验成员在启动第一个可运行全栈项目前，先在本机安装并验证以下 3 个基础工具（仅设计文档评审阶段可暂不装 Docker）：

| 工具 | 最低要求 | 用途 | 终端核验命令 |
|---|---|---|---|
| **Node.js (LTS)** | `>= 20.19`（推荐 **`22 LTS`**） | 运行脚手架、门禁脚本、前端 Vite 与后端 Hono | `node -v && npm -v` |
| **Git** | `2.30+` | 克隆模板、管理分支快照与 Pre-commit 钩子 | `git --version` |
| **Docker Desktop** | 最新稳定版（需启动后台服务） | 运行 `npm run db:up` 本地 PostgreSQL 16 容器及 `deploy/` 生产镜像 | `docker --version && docker compose version` |

## 1. 拿到文件后如何开始

### 模式 A：从 GitHub 公开仓库通过 AI 一键启动（团队最推荐）
成员在本地打开新建的空项目目录，直接把下面这段话发给 Antigravity 中的 AI：
> 请从我们团队的 GitHub 标准仓库 `https://github.com/Shawn-cz/fullstack-product-workflow.git` 获取最新的工作流文件：将里面的 `.agents`、`AGENTS.md`、`.gitattributes`、`规范文件` 和 `开始使用.md` 复制到当前项目根目录（删除克隆带过来的 `.git` 文件夹并运行 `git init` 初始化当前业务仓库），然后立即激活 `fullstack-product-delivery` 技能。若是新建全栈项目，先运行 `node 规范文件/starter/init-project.mjs --target .` 初始化最小可运行全栈底座，复制 `.env.example` 为 `.env` 后执行 `npm install && npm run hooks:install`（首次运行 E2E 前再执行 `npx playwright install chromium`），协助我启动本次任务：
> **[在这里写你要做的产品需求或功能]**

### 模式 B：本地压缩包解压或其他 AI 工具
1. 将 `.agents/`、`AGENTS.md`、`.gitattributes` 和 `规范文件/` 复制到项目根目录，**切勿将 `历史归档_勿喂给AI/` 拖入 AI 聊天窗**。
2. 网页端可复制下方第 4 节启动说明，连同 `规范文件/00_主流程.md`、`规范文件/04_AI项目执行说明.md` 发送给 AI。

## 2. 团队默认黄金技术栈与工程基座（S0–S8）

新建项目无既有仓库强约束时，运行 **`node 规范文件/starter/init-project.mjs --target .`** 即可一键铺齐最小可运行底座（含 `index.html`、`src/main.tsx`、`src/App.tsx`、`server/index.ts`、`server/config/env.ts`、`/api/auth/login|logout|me` 认证路由、`safe-db-reset.mjs`、`run-migrate.mjs`、`init-app-user.sh`、`.dockerignore` 与 `.gitattributes`；**禁用 Vue、SQLite、Element Plus、Naive UI、uni-app 与 Capacitor**）：

| 层级 | 团队统一默认技术栈 | 零经验成员防呆与验真配套 |
|---|---|---|
| **Web 前端与品牌主题** | **React 19 + TypeScript (`strict`) + Vite + Tailwind CSS v4 + Preline UI**（内置 `index.html`、`main.tsx`、`App.tsx`、`usePrelineInit` 与 `src/styles/theme.css` `STD-FE-07`）+ Zustand / TanStack Query | 浏览器实际渲染对照、`npm run check`（已忽略 `规范文件/**` 不冲突）；前端只导入同构 `base-contract.schema.ts` |
| **后端、契约与安全认证** | **Node.js 22 LTS + Hono（Zod 环境校验 + `csrf`/Origin 校验）+ `@hono/node-server` + TypeScript + Zod + Pino**（`/api/auth/login|logout|me` 对齐共享契约、限流、恒定时间异步 `scrypt` 与严格吊销；`protectedApi` + `createRequireAuth`/`requireRole`） | 与 Playwright `auth-contexts.ts` 开箱对齐；`requestTraceId` 全链路透传与异常安全摘要；严禁 `localStorage` 存令牌 |
| **数据库、安全清库与自动化越权** | **PostgreSQL 16 + Prisma ORM**（本地仅绑定 `127.0.0.1` 防暴露，支持 `POSTGRES_PORT` 多项目并行）+ `prisma/test-accounts.ts` & `seed.ts` + `safe-db-reset.mjs` 清库守卫 + Playwright 多角色 Fixture | `npm run test:e2e:fresh` 先核验目标库再重置并跑双上下文越权与旧 Cookie 重放测试；`npm run db:studio` 可视化查库 |
| **移动 App（双模式）** | **模式 A（常规）**：既有 App 修改优化并对接 `contracts/openapi-baseline.yaml`<br>**模式 B（条件：明确从 0 新建）**：优先 **React Native + TS** 或原生 | 模式 A 严格继承原工程风格；模式 B 才调用新建与提审分支 |
| **跨端防呆、门禁与五重指纹** | **`.gitattributes` + POSIX 排序与 LF 归一化哈希** + 显式刷新索引树（`npm run index:build`）+ 只读 Node Pre-commit（不自动 `git add`）+ 门禁（`npm run gates`，支持 `.workflow-profile.json` 与 `--scope=minor`）+ 五重指纹严格锁定（`npm run gates:lock`） | 含迁移/测试/构建配置指纹，拒绝 `{}` 空锁绕过与空文档幽灵标签；已有工程/小变更可按规则裁剪，仍拦未授权新引入旧栈 |
| **S8 生产部署与流式备份** | **`deploy/` 生产基线**：`.dockerignore` + `node:22-alpine` 预编译非 root `Dockerfile` + 独立 `migrate` 先迁移后启 `app` + 最小权限 `APP_DB_USER` + `Caddyfile` + 流式备份 | 单 `.env.production` 管理；先迁移再放行 `/readyz`；`npm run db:backup:prod` 流式生成 `.sql` + `.sha256` 并支持单事务恢复 |

## 3. 日常执行入口与工具包导航

| 需要做的事 | 打开哪个文件 / 目录 |
|---|---|
| 一键初始化新项目最小可运行全栈底座 | [规范文件/starter/](规范文件/starter/README.md)（`init-project.mjs`） |
| 一键触发 AI 技能与工作区规则 | [SKILL.md](.agents/skills/fullstack-product-delivery/SKILL.md) / [AGENTS.md](AGENTS.md) |
| 一屏定位 124 条规则行号、模板与工具包 | [工作流索引树](规范文件/INDEX_TREE.md) |
| 同构契约基线、RBAC 权限与对象存储/异步任务基线 | [规范文件/contracts/](规范文件/contracts/README.md)（含 [auth-rbac-baseline.md](规范文件/contracts/auth-rbac-baseline.md)、[storage-jobs-baseline.md](规范文件/contracts/storage-jobs-baseline.md)） |
| 自动索引树、跨平台 Pre-commit/PR、门禁与维护脚本 | [规范文件/ci/](规范文件/ci/README.md)（含 `maintain-workflow.mjs`） |
| S8 预编译生产 Docker/Caddy HTTPS/健康探针/备份恢复包 | [规范文件/deploy/](规范文件/deploy/README.md) |
| 判断阶段、ATDD 闭环与三级裁剪 | [00 主流程](规范文件/00_主流程.md) |
| 查具体设计与工程规则（124 条） | [01 规则库](规范文件/01_规则库.md) |
| 按阶段取用轻量单文件模板（`T01`–`T13`） | [规范文件/templates/](规范文件/templates/T01_项目启动与裁剪卡.md)（全集见 [02 模板包](规范文件/02_模板包.md)） |
| 看闭环 `AC`、PostgreSQL Schema、Preline 组件与指纹样本 | [03 工单案例](规范文件/03_贯穿案例_工单.md) |
| Git 救生、黑盒验真法、CI 门禁边界、部署运维与指纹锁定详解 | [06 质量基线](规范文件/06_工程质量与审计验收基线.md) |
| 既有 App 对接与条件新建 App 双模式 | [08 移动专项](规范文件/08_移动App专项.md) + [T13](规范文件/templates/T13_移动App项目补充卡.md) |

## 4. 网页端/跨工具备用启动说明

> 请使用《软件产品设计与全栈交付工作流 v1.4.0》协助我推进实际项目。
>
> 本次任务：[填写要解决的问题或要开发/修改的功能]。
> 需求性质：[团队负责人明确指令（直接登记 DEC 进 S2，免外部访谈） / 探索型需求]。
> 产品类型：[Web / 既有 App 修改与接口对接 / 从 0 新建 App / 多端]。
> 本轮交付终点：[设计 / 原型 / 可运行软件 / 已获授权范围内的生产发布]。
>
> 先读取 `规范文件/INDEX_TREE.md`、`规范文件/00_主流程.md` 与 `规范文件/04_AI项目执行说明.md`（已有项目首读 `PROJECT_INDEX_TREE.md`，已有工程/移动模式 A 可经 `.workflow-profile.json` 裁剪），按阶段只读取 `规范文件/templates/` 对应单文件模板。新建项目先运行 `git init` 与 `node 规范文件/starter/init-project.mjs --target .` 生成 40 文件最小可运行底座（含 `server/config/env.ts`、`safe-db-reset.mjs`、`run-migrate.mjs`、`init-app-user.sh`、`/api/auth/login|logout|me`、`.dockerignore`、`.gitattributes`），复制 `.env.example` 为 `.env` 后执行 `npm install && npm run hooks:install`（`npm run db:up` 已带 `--wait` 健康等待；首次 E2E 前运行 `npx playwright install chromium`）。
>
> 完整/功能路径执行 **“需求 `REQ` → 结构化 `AC` → 全覆盖 `@req/@ac` 先行测试（RED）→ 编码实现（GREEN）→ `npm run index:build` + `npm run gates` + Playwright 自动越权（Gate 3d）+ `npm run gates:lock` 锁定指纹”** 闭环（低风险文案/样式小变更按 `00_主流程` 裁剪并用 `--scope=minor`，Pre-commit 仅只读检查）；由你代管分支与 Git 快照；每次实现后结合 `npm run test:e2e:fresh` 截图报告输出 1–2 分钟业务黑盒验真步骤。触及 D0/D1 权限资金、数据迁移或 S8 生产发布时，提醒我执行 `npm run db:backup:prod` 并发起独立审计会话或团队负责人复核。

## 5. 验证、维护与历史归档材料

- [当前验证记录](规范文件/验证记录.md)｜[版本变更](规范文件/CHANGELOG.md)｜[体系结构](规范文件/ARCHITECTURE.md)｜[项目交接](规范文件/session_handoff.md)｜[v1.1.0 缺口整改报告](规范文件/审计报告_v1.1.md)。
- **母版结构检查**与本地打包清单（`规范文件/文档检查结果.json` 与 `交付文件清单.json`，已加入 `.gitignore`）由 `node 规范文件/ci/maintain-workflow.mjs --check` / `--pack` 执行；生成的 40 文件底座隔离初始化、构建、真实 PostgreSQL 认证吊销与 Docker 镜像冒烟验证由母版仓库 [workflow-smoke.yml](.github/workflows/workflow-smoke.yml) 持续执行。
- 历史版本基线包（0.5–1.3.0）与旧审计报告仅随本地 ZIP 压缩包存放在 `历史归档_勿喂给AI/` 目录（已加入 `.gitignore`，不进入 Git 仓库）。
