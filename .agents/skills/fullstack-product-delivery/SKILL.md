---
name: fullstack-product-delivery
description: Use when starting, designing, implementing, modifying, verifying, or auditing any Web or mobile App feature, UI change, or bugfix under the team's full-stack product delivery workflow
---

# 软件产品设计与全栈交付工作流 (v0.9.0)

## Overview

面向**零开发工作经验团队**的单人全栈产品设计与开发执行规范（S0–S9）。
**核心原则：** 成员负责业务决策与黑盒可观察验收；AI 负责契约落地、测试先行（ATDD 闭环）、代码实现、Git 快照救生与 CI 四道硬门禁校验。**违反规则字面要求即违反规则精神。**

## When to Use

- 启动新产品、新功能迭代、已有界面修改优化、既有移动 App 接口对接/从 0 新建 App，或缺陷修复
- 将模糊业务想法转化为需求与结构化验收条件（T03 `REQ/AC`）、业务状态与权限（T04）、通用契约与架构（T05/`contracts/`）、React/Preline 界面（T06）、先行测试与指纹验收（T07/T12/`ci/`）

## 团队默认黄金技术栈（STD-ARC-09）

新建项目无既有仓库强约束时，**必须默认采用以下黄金技术栈**（严禁擅自选用 Vue、SQLite、Element Plus、Naive UI、uni-app 或 Capacitor）：

| 层级 | 默认黄金技术栈 | 零经验成员配套与防呆 |
|---|---|---|
| **Web 前端** | **React 18/19 + TypeScript (`strict`) + Vite + Tailwind CSS + Preline UI**（或按需采用 Meta StyleX/Lexical 生态）+ Zustand / TanStack Query | 浏览器实际渲染对照、`tsc --noEmit`、路由切换按需调用 `HSStaticMethods.autoInit()` |
| **后端与契约** | **Node.js (LTS) + Hono / Fastify + TypeScript + Zod**（强制继承 [contracts/](../../../规范文件/contracts/README.md) 通用响应信封、错误码、分页与 `computePayloadFingerprint` 幂等载荷指纹） | F12 Network 状态码与标准 `ApiErrorResponse` 核对 |
| **数据库与 ORM** | **PostgreSQL 16 + Prisma ORM**（本地用 [docker-compose.postgres.yml](../../../规范文件/ci/docker-compose.postgres.yml) 同构容器；**严禁 SQLite**） | 运行 `npx prisma studio` 在浏览器可视化核对 PostgreSQL 真实落库数据 |
| **移动 App** | **模式 A（默认常规）**：既有 App 修改优化并对接 `contracts/openapi-baseline.yaml`<br>**模式 B（条件调用：明确从 0 新建）**：优先评估 **React Native + TS** 或 iOS/Android 原生 | 模式 A 严格继承原工程风格与架构；模式 B 才走完整新建与首次上架流程 |
| **CI 与指纹门禁** | [github-actions-ci.yml](../../../规范文件/ci/github-actions-ci.yml) + [verify-gates.mjs](../../../规范文件/ci/verify-gates.mjs) + ESLint + Prettier + Vitest + Playwright | 四道自动化硬门禁全绿 + 三重 SHA-256 指纹一致性校验 |

## 执行步骤与按需加载（Progressive Disclosure）

**禁止一次性加载全部模板或历史归档文件（`历史归档_勿喂给AI/`）。** 按当前阶段仅加载所需文件：

1. **先判路径与模式**：读取 [stage-routing.md](./references/stage-routing.md) 或 [00_主流程.md](../../../规范文件/00_主流程.md)，判断裁剪路径（完整 / 功能 / 小变更）、需求性质（探索型 vs 指令契约型 `STD-REQ-01`），以及移动端模式（模式 A 既有 App 对接 vs 模式 B 从 0 新建）。
2. **按阶段只读单文件模板**：从 [规范文件/templates/](../../../规范文件/templates/) 读取当前阶段对应的 `T01`–`T13` 独立模板（1–9 KB），不要全量复制无关模板。
3. **查强制规则与通用基线**：按阶段触发条件查阅 [01_规则库.md](../../../规范文件/01_规则库.md)；S4 直接复制继承 [contracts/](../../../规范文件/contracts/README.md)；S6 复制配置 [ci/](../../../规范文件/ci/README.md)；代码与验收必读 [06_工程质量与审计验收基线.md](../../../规范文件/06_工程质量与审计验收基线.md)；移动端读 [08_移动App专项.md](../../../规范文件/08_移动App专项.md)。
4. **严格执行“需求 → 验收 → 测试 → 编码”四步闭环（STD-GOV-03 / STD-QA-01）**：
   - 先在 T03 写出需求 `REQ-xxx` 及结构化 `AC-xxx`（Given/When/Then）；
   - 再在 S6 写出绑定 `// @req REQ-xxx @ac AC-xxx` 注释标签的测试骨架并运行确认因缺实现而失败（`RED`）；
   - 最后才编写业务代码使测试转绿（`GREEN`）。**禁止先写代码后补测试，禁止写无 REQ 来源的野生代码。**
5. **改码前先做 Git 保存点（STD-CODE-11）**：在 S6–S7 动手改代码前，先运行 `git status` 建保存点；每跑通一个最小闭环立即保存 Git 快照。若连续两次修复同一报错失败，立即协助成员回退至上一正常快照。
6. **运行四道硬门禁、三重指纹与黑盒验真（STD-QA-12 / STD-QA-13 / STD-AUD-07）**：
   - 跑通 `node scripts/verify-gates.mjs --all` 与 PostgreSQL 容器测试（禁止 `.skip`/`.only`/空 `catch`）；
   - 输出 3–5 步零经验成员可亲自操作的黑盒验真清单（浏览器渲染、双无痕窗口越权、F12 Network 状态码、`npx prisma studio` 查库与载荷指纹）；
   - 用 `--gate=4` 锁定当前 Commit、契约目录与 `schema.prisma` 的 SHA-256 指纹。
7. **高风险独立复核门禁（STD-QA-12）**：触及 **D0/D1 权限与资金逻辑、破坏性数据迁移（STD-DAT-04）或 S8 生产发布** 时，必须发起**独立上下文交叉审计会话**或交由团队负责人签字确认。

## Rationalization Table（常见违规借口与反制）

| 常见借口 (Excuse) | 事实与强制处理 (Reality) |
|---|---|
| “先用 SQLite 跑通本地测试，上线再换 PostgreSQL” | 违反 `STD-ARC-09`。本地必须使用 `docker-compose.postgres.yml` 同构 PostgreSQL 16，严禁 SQLite 掩盖并发锁与数据类型差异。 |
| “先用 Vue / Element Plus / Naive UI / uni-app 顺手写完” | 违反 `STD-ARC-09` / `STD-REACT-01` / `STD-MOB-01`。黄金技术栈已统一为 React + Preline UI（或 Meta 生态），且禁用 uni-app / Capacitor。 |
| “先写完功能代码，测试最后再统一补上” | 违反 `STD-QA-01` 与 ATDD 闭环。必须先拆 `AC-xxx`，再写带 `@req/@ac` 标签的测试并运行见红（RED），再编码实现。 |
| “上次测试已经通过了，我只改了一个字段就不重跑了” | 违反 `STD-AUD-07` 指纹规则。契约、Schema 或源码变化哪怕 1 字节，旧验收即刻失效为 `Stale`，Gate 4 将阻断放行。 |
| “用户要改一下现有 App 的页面，我直接帮他新建一个 App 工程” | 违反 `STD-MOB-01`。移动端默认走模式 A（既有 App 修改与通用契约对接），仅明确立项新建 App 时才调用模式 B。 |
| “这是内部指令需求，但 S1 要求用户访谈，先停下来等访谈” | 违反 `STD-REQ-01`。负责人明确下达的指令型需求直接登记 `DEC` 进入 S2，不卡外部访谈。 |

## Red Flags - STOP and Check

- 准备在项目中使用 SQLite、Vue 3、Element Plus、Naive UI、uni-app 或 Capacitor
- 准备在没有 `REQ`/`AC` 和先行 `@req/@ac` 测试（RED）的情况下直接写业务实现代码
- 测试文件里出现 `.skip`、`.only` 或空 `catch {}` 伪造通过
- 在没有任何 Git 快照点、四道门禁执行记录或 SHA-256 指纹锁的情况下宣布验收通过

## 每轮结束标准汇报格式

> **当前阶段**：[S…｜路径：完整/功能/小变更｜移动模式（如适用）：A对接 / B新建]
> **本轮成果与 Git 快照**：[修改的文件路径｜当前快照 commit 哈希]
> **四道门禁与指纹状态**：[Gate 1–4 结果｜契约与 Schema SHA-256 指纹摘要]
> **请您执行的黑盒验真步骤（3 分钟）**：[1. 浏览器访问… 2. 双窗口越权检查… 3. `npx prisma studio` 核对…]
> **待决定/下一步**：[仅列影响业务结果或权限的必要问题，或下一具体动作]
