# 工作流体系结构

版本：1.4.0（安全加固与门禁防绕过闭环版）。本项目包含可跨平台使用的 Markdown 规范包、S0–S8 最小可运行全栈脚手架（`starter/`，含 `server/config/env.ts`、`safe-db-reset.mjs`、预置 `/api/auth/*`、`createRequireAuth`/`requireRole`、`.dockerignore`、`.gitattributes` 与 Playwright 多角色隔离越权底座）、双索引树（`INDEX_TREE.md` + `build-index-tree.mjs`）、前后端同构契约/RBAC/存储与异步任务基线（`contracts/`）、跨平台 Pre-commit/PR 模板/五重指纹 CI 门禁与维护脚本（`ci/`）、S8 `node:22` 预编译生产容器/先迁移后启服务/最小权限 DB/HTTPS 与流式备份包（`deploy/`），以及精简至 `< 5KB` 的原生 `.agents/skills/fullstack-product-delivery/` 技能与根目录 `AGENTS.md` 规则入口。

## 信息分层

| 层 | 文件 / 目录 | 权威职责 |
|---|---|---|
| 自动触发入口 | `AGENTS.md`、`.agents/skills/fullstack-product-delivery/` | 在 AI IDE 中自动识别工作流纪律、双索引树首读、一键脚手架、安全与生产红线及阶段路由 |
| 导航与索引 | `开始使用.md`、`README.md`、`规范文件/README.md`、`规范文件/INDEX_TREE.md` | 团队启动入口、124 条规则行号切片导航树与 GitHub 一键口令 |
| 流程 | `规范文件/00_主流程.md` | 全栈执行顺序、ATDD 四步闭环、三级裁剪、指令型需求豁免、完成条件 |
| 规则 | `规范文件/01_规则库.md` | 124 条有效唯一规则 ID（`STD-*`）、触发条件、强制动作与验证要求 |
| 工程与生产资产基线 | `规范文件/starter/`、`规范文件/contracts/`、`规范文件/ci/`、`规范文件/deploy/` | 一键脚手架/主题/Pino/种子、同构契约/RBAC/存储与任务基线、自动索引树/Pre-commit/PR/双向 CI 门禁、S8 生产容器/HTTPS/探针/备份 |
| 产物结构 | `规范文件/02_模板包.md` 及 `规范文件/templates/T01~T13` | 按阶段记录实际项目成果的轻量单文件结构 |
| 案例参考 | `规范文件/03_贯穿案例_工单.md` | 展示需求 `AC`、PostgreSQL Prisma、React/Preline 组件、`@req/@ac` 测试与指纹证据格式 |
| AI 执行 | `规范文件/04_AI项目执行说明.md` | AI 执行闭环、分支与 Git 快照救生、CI 门禁与黑盒验真步骤的方式 |
| 演进 | `规范文件/05_来源与更新机制.md` | 50 组外部来源登记、候选修订、发布与迁移 |
| 质量应用 | `规范文件/06_工程质量与审计验收基线.md` | Git/Pre-commit、同构与 RBAC、生产部署/脱敏日志/品牌主题/存储与任务、黑盒验真、双向 CI 门禁与三重指纹防过期 |
| 推进应用 | `规范文件/07_项目推进与多agent执行.md` | 增量、依赖、并行开发与独立上下文交叉审计子 agent 说明 |
| 平台应用 | `规范文件/08_移动App专项.md` | 移动端双模式（模式 A：既有 App 修改与对接；模式 B：条件调用从 0 新建 App） |
| 维护 | `CHANGELOG`、`session_handoff`、`验证记录`、`审计报告_v1.1` | 当前版本变更、恢复上下文与真实检查结果 |
| 历史归档 | `历史归档_勿喂给AI/` | 物理隔离历史版本基线 zip（0.5–1.0.0）、manifest、diff 及旧审计报告，避免污染 AI 上下文 |

实际项目成果使用 REQ/AC/RULE/API/UI/TASK/TEST/EVD 等项目 ID；本工作流规则使用 STD 前缀，来源使用 SRC，模板使用 T。

## 渐进式上下文加载（Progressive Disclosure）设计

1. **常驻轻量规则（< 5KB）**：根目录 `AGENTS.md` 与 `SKILL.md` 仅声明核心纪律、黄金技术栈与阶段路由表。
2. **按阶段单模板加载（1–9KB）**：进入某阶段时，仅从 `规范文件/templates/` 读取对应的单个模板文件。
3. **工程与生产资产一键初始化**：新建项目用 `starter/init-project.mjs` 一次性铺入 `contracts/`、`ci/`、`deploy/` 与主题/日志/种子底座，避免 AI 重复编写样板配置。
4. **历史归档物理隔离**：历史 baseline 压缩包与旧审计报告隔离于 `历史归档_勿喂给AI/`，`.gitignore` 默认排除，不进入日常项目仓库。

## 维护约束

规则新增或修改 → 同步检查相关阶段、汇总模板 `02_模板包.md`、独立模板 `templates/T*.md`、脚手架/契约/门禁/部署资产、Skill 路由表、案例与来源 → 记录语义变化 → 运行链接、计数与脚本校验。删除或替换规则时保留弃用与替代说明，不复用旧编号表示不同含义。
