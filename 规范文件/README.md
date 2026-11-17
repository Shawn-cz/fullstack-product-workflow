# 软件产品设计与全栈交付工作流

版本：0.9.0｜日期：2026-11-17｜状态：已完成 React/Preline/PostgreSQL 黄金栈切换、通用契约包、四道 CI 硬门禁、ATDD 闭环、三重指纹规则与移动端双模式改造。

面向**完全没有开发工作经验**、希望每位成员成长为全栈产品设计师并借助 AI 完成软件需求、设计、实现验证与持续改进的团队。通过**团队默认黄金技术栈（STD-ARC-09）**统一为 React + Tailwind + Preline UI（或 Meta 生态）+ Node.js + Prisma + PostgreSQL 16；通过**通用契约包（`contracts/`）**与**四道 CI 硬门禁（`ci/`）**消除前后端及移动端对接分歧；通过**ATDD 四步闭环 + 三重 SHA-256 指纹**防止野生代码与过期验收；通过**Git 快照救生与黑盒验真法（STD-CODE-11 / STD-QA-12）**护航零经验成员安全交付。

当前内容：10 个阶段、116 条有效规则、13 份模板（含 `templates/` 独立单文件拆分）、通用契约包（`contracts/`）、CI 门禁脚本（`ci/`）、贯穿案例（含 PostgreSQL/React/Preline/@req/@ac/指纹示范）、Antigravity 原生 Skill（`.agents/skills/fullstack-product-delivery/`），以及 50 组来源登记。

## 从这里开始

1. **在 Antigravity 中使用**：确保项目根目录包含 `.agents/`、`AGENTS.md` 与 `规范文件/`，直接对 AI 说“按团队全栈工作流推进任务：[你的需求]”。
2. **理解主线与 ATDD 闭环**：先读 [主流程](00_主流程.md)；先在 `T03` 拆分结构化 `AC-xxx`，再在 `S6` 写出绑定 `@req/@ac` 标签的先行测试（RED），再编写实现（GREEN），最后通过 `ci/verify-gates.mjs` 与黑盒验真锁定 SHA-256 指纹关闭需求。
3. **按阶段按需取用单文件模板**：从 [templates/](templates/T01_项目启动与裁剪卡.md) 复制当前阶段对应的单个模板，S4 继承 [contracts/](contracts/README.md)，S6 部署 [ci/](ci/README.md)。
4. **移动端双模式**：常规任务走模式 A（既有 App 修改优化并对接通用契约包），仅明确立项新建 App 时才调用模式 B（见 [08_移动App专项.md](08_移动App专项.md)）。

## 文件地图

| 文件 / 目录 | 用途 |
|---|---|
| [00_主流程.md](00_主流程.md) | S0–S9 顺序、ATDD 四步闭环、三级裁剪、指令型需求通道、完成条件 |
| [01_规则库.md](01_规则库.md) | 116 条有效设计与工程规则（含 React/Preline、PostgreSQL、契约基线、载荷/证据指纹、CI 门禁与移动双模式） |
| [02_模板包.md](02_模板包.md) | T01–T13 完整模板合集（日常优先按需读取 [templates/](templates/T01_项目启动与裁剪卡.md) 单文件） |
| [templates/](templates/T01_项目启动与裁剪卡.md) | 拆分后的 T01–T13 独立轻量模板（1–9KB/个），节省 AI 上下文 |
| [contracts/](contracts/README.md) | 通用契约包基线（`base-contract.schema.ts`、`openapi-baseline.yaml` 与 `computePayloadFingerprint`） |
| [ci/](ci/README.md) | GitHub Actions 四道硬门禁配置、PostgreSQL 16 Docker Compose 与 `verify-gates.mjs` 校验脚本 |
| [03_贯穿案例_工单.md](03_贯穿案例_工单.md) | 工单需求如何贯通 `AC`、PostgreSQL Prisma、React/Preline 组件、`@req/@ac` 先行测试及指纹证据范本 |
| [04_AI项目执行说明.md](04_AI项目执行说明.md) | AI 读取、代管 Git 快照、执行 ATDD 闭环、跑通门禁与输出黑盒验真步骤的约束 |
| [05_来源与更新机制.md](05_来源与更新机制.md) | 50 组官方来源、版本状态、更新分级、发布与回退机制 |
| [06_工程质量与审计验收基线.md](06_工程质量与审计验收基线.md) | Git 救生（4.3）、契约指纹（5.4）、黑盒验真（6.1）、ATDD 与 CI 门禁（6.2）、三重指纹防伪（7.3） |
| [07_项目推进与多agent执行.md](07_项目推进与多agent执行.md) | MVP/增量拆解、里程碑、依赖、并行开发与独立交叉审计子 agent 执行 |
| [08_移动App专项.md](08_移动App专项.md) | 模式 A（既有 App 修改与契约对接）vs 模式 B（条件调用：从 0 新建 App）双模式专项 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 本套工作流的信息分层、Skill 路由与权威关系 |
| [CHANGELOG.md](CHANGELOG.md) | 工作流版本变化（0.1.0 → 0.9.0） |
| [session_handoff.md](session_handoff.md) | 当前成果、局限和下一步 |
| [审计报告_v0.9.md](审计报告_v0.9.md) | v0.9.0 八项工程化改造方案落实与复核报告 |
| [验证记录.md](验证记录.md) | 0.9.0 实际结构检查与门禁脚本自检结果 |
