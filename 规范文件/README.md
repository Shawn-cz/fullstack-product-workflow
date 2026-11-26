# 软件产品设计与全栈交付工作流

版本：1.0.0（正式试点版）｜日期：2026-11-26｜状态：已完成 P0+P1 全部 5 项工程化底座补强（G-01 同构契约修复、G-02 一键脚手架、G-03 Gate 1 双向覆盖闭环、G-04 认证与三层 RBAC 底座、G-05 合成测试种子工厂），具备团队全面试点条件。

面向**完全没有开发工作经验**、希望每位成员成长为全栈产品设计师并借助 AI 完成软件需求、设计、实现验证与持续改进的团队。

当前内容：10 个阶段、119 条有效规则、13 份独立单文件模板、一键黄金栈脚手架（`starter/`）、工作流与项目双索引树机制（`INDEX_TREE.md` + `build-index-tree.mjs`）、前后端同构契约与 RBAC 权限底座（`contracts/`）、双向闭环四道硬门禁脚本（`ci/`）、Antigravity 原生 Skill（`.agents/skills/fullstack-product-delivery/`），以及 50 组来源登记。

## 从这里开始

1. **在 Antigravity 中使用**：确保项目根目录包含 `.agents/`、`AGENTS.md` 与 `规范文件/`，直接对 AI 说“按团队全栈工作流推进任务：[你的需求]”。
2. **新项目一键初始化黄金栈底座**：运行 `node 规范文件/starter/init-project.mjs --target .`，1 秒钟生成配好的 React 19 + Preline + Hono + Prisma PostgreSQL 16 + RBAC 中间件 + 4 角色测试种子 + 索引树与四道 CI 门禁。
3. **理解主线与双向 ATDD 闭环**：先读 [工作流索引树](INDEX_TREE.md) 与 [主流程](00_主流程.md)；先在 `docs/`（T03）写全 `REQ/AC`，再在 `tests/` 写出覆盖全部 `REQ/AC` 的先行测试（RED），编码转绿后运行 `npm run index:build && npm run gates`。
4. **30 秒黑盒验真**：运行 `npm run db:reset` 灌入 `member_a@example.test` / `member_b@example.test` 等固定测试账号，开双无痕窗口核验越权并在 `npm run db:studio` 查 PostgreSQL 表。

## 文件地图

| 文件 / 目录 | 用途 |
|---|---|
| [INDEX_TREE.md](INDEX_TREE.md) | 本规范包自身一屏导航树（119 条规则行号区间、脚手架与症状一跳表） |
| [starter/](starter/README.md) | **黄金技术栈一键初始化脚手架**（`init-project.mjs` + 9 份配置/RBAC/Preline/种子模板） |
| [contracts/](contracts/README.md) | **同构通用契约包与 RBAC 权限基线**（`base-contract.schema.ts`、`fingerprint.server.ts`、`openapi-baseline.yaml`、`auth-rbac-baseline.md`） |
| [ci/](ci/README.md) | **索引树生成与双向闭环四道硬门禁**（`build-index-tree.mjs`、`verify-gates.mjs`、`github-actions-ci.yml`、`docker-compose.postgres.yml`） |
| [00_主流程.md](00_主流程.md) | S0–S9 顺序、ATDD 四步闭环、三级裁剪、指令型需求通道、完成条件 |
| [01_规则库.md](01_规则库.md) | 119 条有效设计与工程规则（含 `STD-GOV-05`、`STD-SEC-05`、`STD-QA-13/14` 等） |
| [02_模板包.md](02_模板包.md) | T01–T13 完整模板合集（日常优先按需读取 [templates/](templates/T01_项目启动与裁剪卡.md) 单文件） |
| [templates/](templates/T01_项目启动与裁剪卡.md) | 拆分后的 T01–T13 独立轻量模板（1–9KB/个） |
| [03_贯穿案例_工单.md](03_贯穿案例_工单.md) | 工单需求如何贯通 `AC`、PostgreSQL Prisma、React/Preline 组件、`@req/@ac` 先行测试及指纹证据范本 |
| [04_AI项目执行说明.md](04_AI项目执行说明.md) | AI 读取、脚手架铺底、代管 Git 快照、双向闭环与黑盒验真转化约束 |
| [05_来源与更新机制.md](05_来源与更新机制.md) | 50 组官方来源、版本状态、更新分级、发布与回退机制 |
| [06_工程质量与审计验收基线.md](06_工程质量与审计验收基线.md) | Git 救生（4.3）、同构与 RBAC（5.4）、黑盒验真（6.1）、双向 CI 门禁（6.2）、三重指纹防伪（7.3） |
| [07_项目推进与多agent执行.md](07_项目推进与多agent执行.md) | MVP/增量拆解、里程碑、依赖、并行开发与独立交叉审计子 agent 执行 |
| [08_移动App专项.md](08_移动App专项.md) | 模式 A（既有 App 修改与契约对接）vs 模式 B（条件调用：从 0 新建 App）双模式专项 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 本套工作流的信息分层、Skill 路由与权威关系 |
| [CHANGELOG.md](CHANGELOG.md) | 工作流版本变化（0.1.0 → 1.0.0） |
| [session_handoff.md](session_handoff.md) | 当前成果、局限和下一步 |
| [审计报告_v1.0.md](审计报告_v1.0.md) | v1.0.0 P0+P1 五项缺口闭环改造与端到端实测验证报告 |
| [验证记录.md](验证记录.md) | 1.0.0 实际结构检查与端到端脚本正负向实测记录 |
