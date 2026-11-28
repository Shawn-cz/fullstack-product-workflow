# 软件产品设计与全栈交付工作流

版本：1.4.0（安全加固与门禁防绕过闭环版）｜日期：2026-11-27｜状态：基于独立 Codex CLI 只读审计完成 3 项 P0 + 16 项 P1 全部整改，强化 Hono 认证中间件与安全防护、清库保护、`127.0.0.1` 数据库绑定、五重指纹防绕过、最小权限生产 DB 与先迁移后启服务。

面向**完全没有开发工作经验**、希望每位成员成长为全栈产品设计师并借助 AI 完成软件需求、设计、实现验证、协作合并、生产部署与持续改进的团队。

当前内容：10 个阶段、124 条有效规则、13 份独立单文件模板、最小可运行全栈脚手架（`starter/`，37 项映射 + 3 份环境/容器文件生成 40 文件 + 1 份 S6 E2E 样板）、工作流与项目双索引树（`INDEX_TREE.md` + `build-index-tree.mjs`）、前后端同构契约/RBAC/存储与任务基线（`contracts/`）、跨平台 Pre-commit/PR/双向门禁与维护脚本（`ci/`）、S8 预编译生产容器/Caddy HTTPS/探针与流式备份恢复包（`deploy/`）、精简 Antigravity Skill（`.agents/skills/fullstack-product-delivery/`），以及 50 组来源登记。

## 从这里开始

1. **安装本机前置工具**：确认已安装 Node.js >= 20.19（推荐 22 LTS）、Git 与 Docker Desktop（详见根目录 [开始使用.md](../开始使用.md)）。
2. **新项目一键初始化最小可运行底座**：运行 `node 规范文件/starter/init-project.mjs --target . && npm install && npm run hooks:install`，即可执行 `npm run index:build && npm run gates && npm run check && npm run build`。
3. **理解主线与双向 ATDD 闭环**：先读 [工作流索引树](INDEX_TREE.md) 与 [主流程](00_主流程.md)；先在 `docs/`（T03）写全 `REQ/AC`，再在 `tests/` 写出覆盖全部 `REQ/AC` 的先行测试（RED），编码转绿后运行 `npm run index:build && npm run gates`。
4. **自动化越权、五重指纹锁定与 S8 上线**：S6 起直接对接预置的 `/api/auth/login|logout|me` 运行 `npm run test:e2e:fresh` 自动完成 `401/403/404` 双账号越权、`HttpOnly` Cookie 与退出重放旧 Cookie 验证（`npm run test:e2e:report` 看截图），验收通过后运行 `npm run gates:lock` 锁定五重指纹；S8 上线按 [deploy/README.md](deploy/README.md) 使用单份 `.env.production` 执行，变更前先跑 `npm run db:backup:prod`。

## 文件地图

| 文件 / 目录 | 用途 |
|---|---|
| [INDEX_TREE.md](INDEX_TREE.md) | 本规范包自身一屏导航树（124 条规则行号区间、脚手架、部署与症状一跳表） |
| [starter/](starter/README.md) | **最小可运行全栈一键初始化脚手架**（`init-project.mjs` 37 项映射 + 3 份环境文件 + 20 份模板 + S6 越权 E2E 样板） |
| [contracts/](contracts/README.md) | **同构通用契约包、RBAC 与存储/任务基线**（`base-contract.schema.ts`、`fingerprint.server.ts`、`openapi-baseline.yaml`、`auth-rbac-baseline.md`、`storage-jobs-baseline.md`） |
| [ci/](ci/README.md) | **索引树、Pre-commit/PR 模板、双向门禁与维护脚本**（`build-index-tree.mjs`、`verify-gates.mjs`、`maintain-workflow.mjs`、`pre-commit.hook`、`pull_request_template.md`、`github-actions-ci.yml`、`docker-compose.postgres.yml`） |
| [deploy/](deploy/README.md) | **S8 生产部署与灾备基线**（预编译非 root `Dockerfile`、先迁移后启服务 `docker-compose.prod.yml`、`init-app-user.sh`、`run-migrate.mjs`、`Caddyfile`、`health-probes.ts.tpl`、`backup-postgres.mjs`） |
| [00_主流程.md](00_主流程.md) | S0–S9 顺序、ATDD 四步闭环、三级裁剪、指令型需求通道、完成条件 |
| [01_规则库.md](01_规则库.md) | 124 条有效设计与工程规则 |
| [02_模板包.md](02_模板包.md) | T01–T13 完整模板合集（日常优先按需读取 [templates/](templates/T01_项目启动与裁剪卡.md) 单文件） |
| [templates/](templates/T01_项目启动与裁剪卡.md) | 拆分后的 T01–T13 独立轻量模板（1–9KB/个） |
| [03_贯穿案例_工单.md](03_贯穿案例_工单.md) | 工单需求如何贯通 `AC`、PostgreSQL Prisma、React/Preline 组件、`@req/@ac` 先行测试及指纹证据范本 |
| [04_AI项目执行说明.md](04_AI项目执行说明.md) | AI 读取、脚手架铺底、代管分支与 Git 快照、双向闭环与黑盒验真转化约束 |
| [05_来源与更新机制.md](05_来源与更新机制.md) | 50 组官方来源、版本状态、更新分级、发布与回退机制 |
| [06_工程质量与审计验收基线.md](06_工程质量与审计验收基线.md) | Git/Pre-commit（4.3）、同构与 RBAC（5.4）、部署/日志/主题/存储（5.5）、黑盒验真（6.1）、CI 门禁边界（6.2）、五重指纹锁定（7.3） |
| [07_项目推进与多agent执行.md](07_项目推进与多agent执行.md) | MVP/增量拆解、里程碑、依赖、并行开发与独立交叉审计子 agent 执行 |
| [08_移动App专项.md](08_移动App专项.md) | 模式 A（既有 App 修改与契约对接）vs 模式 B（条件调用：从 0 新建 App）双模式专项 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 本套工作流的信息分层、Skill 体积预算与权威关系 |
| [CHANGELOG.md](CHANGELOG.md) | 工作流版本变化（0.1.0 → 1.4.0） |
| [session_handoff.md](session_handoff.md) | 当前成果、规模和交接指引 |
| [审计报告_v1.1.md](审计报告_v1.1.md) | v1.1.0 P2+P3 四项缺口（G-06~G-09）整改记录（项目自审） |
| [验证记录.md](验证记录.md) | 1.4.0 独立 Codex 审计整改、安全加固与实构建实测记录 |
