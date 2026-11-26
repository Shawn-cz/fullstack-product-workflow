# 开始使用：软件产品设计与全栈交付工作流

交付版本：0.9.1｜整理日期：2026-11-26｜形式：内置 Antigravity Skill（`.agents/skills/` + `AGENTS.md`）、双索引树（`INDEX_TREE.md` + `build-index-tree.mjs`）、通用契约包（`contracts/`）、CI 四道硬门禁模板（`ci/`）及可跨工具使用的 Markdown 规范包。

专为**零开发工作经验的全栈产品设计团队**打造，覆盖 Web、后端接口及移动 App（既有 App 修改对接 / 条件从 0 新建 App）。当前含 10 阶段、117 条有效规则、13 份独立按需加载模板（`规范文件/templates/`）、规范与项目双索引树机制、开箱即用的 Zod/OpenAPI 通用契约包（`规范文件/contracts/`）、PostgreSQL + GitHub Actions 四道门禁脚本（`规范文件/ci/`）、50 组来源及含闭环代码与指纹证据范本的工单设计案例。

## 1. 拿到文件后如何开始

### 模式 A：从 GitHub 公开仓库通过 AI 一键启动（团队最推荐）
成员在本地打开新建的空项目目录，直接把下面这段话发给 Antigravity 中的 AI：
> 请从我们团队的 GitHub 标准仓库 `https://github.com/Shawn-cz/fullstack-product-workflow.git` 获取最新的工作流文件：将里面的 `.agents`、`AGENTS.md`、`规范文件` 和 `开始使用.md` 复制到当前项目根目录（删除克隆带过来的 `.git` 文件夹，断开与原模板库的远程关联），然后立即激活 `fullstack-product-delivery` 技能，协助我启动本次任务：
> **[在这里写你要做的产品需求或功能]**

### 模式 B：本地压缩包解压或其他 AI 工具
1. 将 `.agents/`、`AGENTS.md` 和 `规范文件/` 复制到项目根目录，**切勿将 `历史归档_勿喂给AI/` 拖入 AI 聊天窗**。
2. 网页端可复制下方第 4 节启动说明，连同 `规范文件/00_主流程.md`、`规范文件/04_AI项目执行说明.md` 发送给 AI。

## 2. 团队默认黄金技术栈与工程基座（STD-ARC-09）

新建项目无既有仓库强约束时，全团队统一采用以下技术底座（**严禁使用 Vue、SQLite、Element Plus、Naive UI、uni-app 或 Capacitor**）：

| 层级 | 团队统一默认技术栈 | 零经验成员防呆与黑盒验真配套 |
|---|---|---|
| **Web 前端** | **React 18/19 + TypeScript (`strict`) + Vite + Tailwind CSS + Preline UI**（或按需 Meta StyleX/Lexical 生态）+ Zustand / TanStack Query | 浏览器实际渲染对照、`tsc --noEmit` 类型检查 |
| **后端与通用契约** | **Node.js (LTS) + Hono / Fastify + TypeScript + Zod**（强制继承 `规范文件/contracts/` 通用契约与 SHA-256 载荷指纹） | 浏览器 F12 → Network 核对标准状态码与 JSON 响应 |
| **数据库（禁用 SQLite）** | **PostgreSQL 16 + Prisma ORM**（本地使用 `规范文件/ci/docker-compose.postgres.yml` 一键拉起与 CI/生产同构的 PostgreSQL 容器） | 运行 `npx prisma studio`，在网页表格里直接查看 PostgreSQL 真实落库字段 |
| **移动 App（双模式）** | **模式 A（常规）**：既有 App 修改优化并对接 `contracts/openapi-baseline.yaml`<br>**模式 B（条件：明确从 0 新建）**：优先 **React Native + TS** 或原生 | 模式 A 严格继承原工程风格；模式 B 才调用新建与提审分支 |
| **闭环、索引树、CI 门禁与指纹** | **项目自动索引树**（`build-index-tree.mjs`）+ **ATDD 四步闭环**（`REQ → AC → @req/@ac 先行测试(RED) → 编码(GREEN)`）+ **GitHub Actions 四道门禁** + **三重 SHA-256 指纹锁** | 新会话先读 `PROJECT_INDEX_TREE.md` 防止重复造轮子；一键运行 `node scripts/verify-gates.mjs --all && npm test` |

## 3. 日常执行入口与工具包导航

| 需要做的事 | 打开哪个文件 / 目录 |
|---|---|
| 一键触发 AI 技能与工作区规则 | [SKILL.md](.agents/skills/fullstack-product-delivery/SKILL.md) / [AGENTS.md](AGENTS.md) |
| 一屏定位全部规则行号、模板与工具包 | [工作流索引树](规范文件/INDEX_TREE.md) |
| 通用契约基线（响应信封、错误码、分页、载荷指纹） | [规范文件/contracts/](规范文件/contracts/README.md) |
| 自动生成项目索引树、PostgreSQL 容器与四道 CI 门禁 | [规范文件/ci/](规范文件/ci/README.md) |
| 判断阶段、ATDD 闭环与三级裁剪 | [00 主流程](规范文件/00_主流程.md) |
| 查具体设计与工程规则（117 条） | [01 规则库](规范文件/01_规则库.md) |
| 按阶段取用轻量单文件模板（`T01`–`T13`） | [规范文件/templates/](规范文件/templates/T01_项目启动与裁剪卡.md)（全集见 [02 模板包](规范文件/02_模板包.md)） |
| 看闭环 `AC`、PostgreSQL Schema、Preline 组件与指纹样本 | [03 工单案例](规范文件/03_贯穿案例_工单.md) |
| Git 救生、黑盒验真法、CI 门禁与指纹防伪详解 | [06 质量基线](规范文件/06_工程质量与审计验收基线.md) |
| 既有 App 对接与条件新建 App 双模式 | [08 移动专项](规范文件/08_移动App专项.md) + [T13](规范文件/templates/T13_移动App项目补充卡.md) |

## 4. 网页端/跨工具备用启动说明

> 请使用《软件产品设计与全栈交付工作流 v0.9.1》协助我推进实际项目。
>
> 本次任务：[填写要解决的问题或要开发/修改的功能]。
> 需求性质：[团队负责人明确指令（直接登记 DEC 进 S2，免外部访谈） / 探索型需求]。
> 产品类型：[Web / 既有 App 修改与接口对接 / 从 0 新建 App / 多端]。
> 本轮交付终点：[设计 / 原型 / 可运行软件 / 已获授权范围内的发布]。
>
> 先读取 `规范文件/00_主流程.md` 与 `规范文件/04_AI项目执行说明.md`，判断裁剪路径并按阶段只读取 `规范文件/templates/` 下对应的单文件模板。新建项目严格采用 **React + TypeScript + Tailwind + Preline UI（或 Meta 生态）+ Node.js + Prisma + PostgreSQL 16**（严禁 SQLite/Vue/uni-app/Capacitor），并继承 `规范文件/contracts/` 与 `规范文件/ci/`。
>
> 执行强制 **“需求 `REQ` → 结构化 `AC` → 带 `@req/@ac` 标签的先行测试（RED）→ 编码实现（GREEN）→ SHA-256 指纹锁回填”** 四步闭环；由你代管 Git 快照并提供单行命令；每次实现后输出 3–5 步零经验成员可操作的黑盒验真步骤（含 `npx prisma studio` 查库）。触及 D0/D1 权限资金、数据迁移或 S8 发布时，提醒我发起独立审计会话或团队负责人复核。

## 5. 验证与历史归档材料

- [0.9 升级审计报告](规范文件/审计报告_v0.9.md)：8 项工程级改造及移动端双模式设计记录。
- [当前验证记录](规范文件/验证记录.md) 与 [文档检查结果](规范文件/文档检查结果.json)。
- [版本变更](规范文件/CHANGELOG.md)、[体系结构](规范文件/ARCHITECTURE.md)、[项目交接](规范文件/session_handoff.md)、[交付文件清单](交付文件清单.json)。
- 历史版本基线包（0.5/0.6/0.7/0.8/0.9.0）与旧审计报告已隔离至 [历史归档_勿喂给AI/](历史归档_勿喂给AI/README_归档说明.md)。
