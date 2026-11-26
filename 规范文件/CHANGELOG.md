# 变更日志

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
