# Session Handoff

日期：2026-11-17（Asia/Shanghai）｜工作流版本：0.9.0

## 用户目标与已明确方向

针对 `v0.8.0` 工作流，用户提出了 8 项明确技术与工程化升级要求，并在确认方案后补充强调**移动端保留从 0 新建 App 条件调用能力**（同时禁止 uni-app/Capacitor）：
1. Web 前端从 Vue 3 切换为 **React**；UI 组件从 Element Plus/Naive UI 切换为 **Preline UI（或 Meta 开源生态）**。
2. 补齐代码级**通用契约包/基线**（`规范文件/contracts/`）。
3. 补齐**自动化门禁与 CI 流水线配置**（`规范文件/ci/`）。
4. 形成**需求（REQ）↔ 验收（AC）↔ 测试（TEST）↔ 编码（TASK）闭环**。
5. 增加**指纹规则**（接口幂等载荷 SHA-256 指纹 + 契约/Schema/证据防篡改防过期指纹锁）。
6. 彻底**禁用 SQLite**，统一采用 **PostgreSQL 16 + Prisma ORM**（本地 Docker 同构）。
7. 移动端不再使用 uni-app 和 Capacitor，常规任务聚焦**既有 App 修改优化与契约对接（模式 A）**，同时保留**从 0 新建 App 条件调用分支（模式 B：优先 React Native + TS 或原生）**。

## 当前成果

- **工程资产包落地**：创建了可直接复制进业务项目的 `规范文件/contracts/`（`base-contract.schema.ts`、`openapi-baseline.yaml`）和 `规范文件/ci/`（`github-actions-ci.yml`、`docker-compose.postgres.yml`、`verify-gates.mjs`）。
- **规则与流程升级**：`01_规则库.md` 更新为 116 条有效规则（弃用 `STD-VUE-01~04`，新增 `STD-REACT-01~04`、`STD-API-07`、`STD-API-08`、`STD-QA-13`、`STD-AUD-07`，更新 `STD-ARC-09`、`STD-GOV-03`、`STD-QA-01`、`STD-MOB-01`）；`05_来源与更新机制.md` 扩充至 50 组来源。
- **模板与案例同步**：重构 `02_模板包.md` 并重新生成 `templates/T01~T13.md`；更新 `03_贯穿案例_工单.md` 示范 React + Preline + PostgreSQL + `@req/@ac` 先行测试 + 三重指纹锁；重构 `08_移动App专项.md` 为双模式路由。
- **Skill 与入口同步**：同步更新 `.agents/skills/fullstack-product-delivery/`、`AGENTS.md`、`开始使用.md`（及同步根目录 `README.md`），归档 `v0.8.0-baseline.zip` 至 `历史归档_勿喂给AI/`，形成 `审计报告_v0.9.md` 与校验报告，并推送至 GitHub 仓库 `Shawn-cz/fullstack-product-workflow`。

## 未完成与局限

- 尚待在实际 React + PostgreSQL 业务试点项目中运行完整 CI 流水线并记录真实运行产物。

## 下一步建议

1. 团队成员使用 GitHub 一键启动口令拉取最新 `v0.9.0` 仓库至首个试点空项目；
2. 按照 `00_主流程.md` 与 `规范文件/ci/` 拉起 PostgreSQL 容器，跑通首条“需求 → AC → 先行测试(RED) → React/后端编码(GREEN) → 门禁与黑盒验真 → 指纹锁定”闭环。
