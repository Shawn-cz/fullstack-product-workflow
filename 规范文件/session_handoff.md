# Session Handoff

日期：2026-11-28（Asia/Shanghai）｜工作流版本：1.4.1（生产凭据白名单、E2E 双库隔离与 CI 全单测闭环封版）

## 本轮里程碑（1.4.0 → 1.4.1 封版收口）

对照 `v1.4.0` Codex 复审报告（`2 P0 + 12 P1 + 4 P2`），经资深工程取舍后精准解决 **4 项真实工程痛点（0 新增文件，保持 40 文件底座）**：
1. **CI `pipefail` 漏跑单测修复（P1-08）**：`github-actions-ci.yml` 改用跨平台 Node 文件发现，`verify-gates.mjs` Gate 1/2 同步覆盖 `tests/test/src/server`。
2. **`test:e2e:fresh` 双库隔离闭环（P0-02 / P1-01）**：`.env.example` 默认开启独立 `TEST_DATABASE_URL`；`safe-db-reset.mjs` 修复 `contest` 词边界与 `[::1]`，S0 无用例安全跳过，S6 同链注入独立测试库与隔离端口 `3101/5273` 并禁复用开发服；`seed.ts` 复用库名保护。
3. **生产凭据隔离与迁移权限同步（P0-01 / P1-10 / P1-03）**：`docker-compose.prod.yml` 的 `app` 服务改为显式环境变量白名单（超管密码不进 `app`）；`run-migrate.mjs` 迁移后幂等同步 `APP_DB_USER` 表权限并收回 `_prisma_migrations` 写权限；生产 `ALLOWED_ORIGINS` 剔除 `localhost`，登录限流加 `10,000` 桶上限并精确匹配 `application/json`。
4. **配置读取与口径对齐（P2-02 / P2-01）**：`vite.config.ts` / `playwright.config.ts` 自动读 `.env` 端口，E2E 重放样例按 `SESSION_COOKIE_NAME` 匹配 Cookie；明确 S0 vs S6 E2E 执行时机。
- **架构师明示不采纳的过度设计项**：保留脱敏后异常 `error.message` 保障零经验成员排障能力；开发期不强制 `--strict-lock` 阻断常规提交；不做复杂 Git 底层暂存快照检出树、Redis 多节点限流或演示业务表。

## 此前里程碑（1.3.1 → 1.4.0）

根据本机 `codex-cli 0.153.4`（`-s read-only`）对 `v1.3.1` 仓库的独立交叉审计结果，完成全部 **3 项 P0 + 16 项 P1 + 3 项 P2（共 22/22 项）**整改并升级至 **`v1.4.0`**：
1. **P0 阻断与安全止血**：新增 `scripts/safe-db-reset.mjs` 清库前置守卫（支持独立 `TEST_DATABASE_URL`）；`eslint.config.mjs` 排除 `规范文件/**` 避免 `npm run check` 报错；本地 PostgreSQL 端口收紧绑定 `127.0.0.1`。
2. **认证、契约与中间件补齐**：新增 `server/config/env.ts` Zod 配置加载器；`base-contract.schema.ts` 新增 `buildApiSuccess`/`buildApiError` 并统一 `/api/auth/*` 与异常响应格式；`auth-rbac.ts` 实现真正的 Hono `createRequireAuth`/`requireRole` 与 `protectedApi` 容器、`assertOwnerOrRole` 默认特权收紧为 `[]`；补齐 `csrf`/Origin 检查、`bodyLimit`、双维限流、恒定时间异步 `scrypt`、`POST /logout` 严格 DB 吊销、隔离重放旧 Cookie 测试及 `logger-trace` 异常摘要脱敏。
3. **CI 门禁、索引与 P2 流程体验闭合**：`build-index-tree.mjs` 修复中文路径 `fileURLToPath` 入口判断并校验完整 Markdown/JSON 内容与 SQL 迁移；`verify-gates.mjs` 修复 POSIX 路径排序、堵住空文档幽灵标签豁免与 Gate 4 `{}` 空锁绕过、升级五重指纹，并新增 `.workflow-profile.json`（已有工程/移动模式 A 声明 `legacyApprovalRef` 裁剪）与 `--scope=minor` 小变更裁剪；`pre-commit.hook` 改为只读核验与未暂存漂移拦截（不再自动 `git add` 工作区）；`github-actions-ci.yml` 统一测试发现规则并阻止有 `REQ/AC` 无测试通过。
4. **S8 最小权限、启动补全与母版隔离 CI**：新增 `deploy/init-app-user.sh` 与 `scripts/run-migrate.mjs`（编码特殊密码），`docker-compose.prod.yml` 分离 `APP_DB_USER` 与 `migrate` 先行服务，`/readyz` 核验 `User` 表就绪；`backup-postgres.mjs` 强制 `--env dev|prod`、支持 `.env.production`、流式备份与 `--single-transaction` 原子恢复；`db:up` 增加 `--wait` 健康等待、启动指引补全 `git init` 与 Playwright 安装；`maintain-workflow.mjs` 动态计数并标明“母版结构检查”；新增母版仓库 `.github/workflows/workflow-smoke.yml`。

## 当前体系规模
- 10 阶段（S0–S9）｜**124 条**唯一有效规则（含 16 条移动专项）｜13 份独立单文件模板｜50 组第一方来源
- 5 个工程与技能目录：`starter/`（23 文件：含 `init-project.mjs`、`README.md`、20 份模板与 1 份 S6 样板）、`contracts/`（6 文件）、`ci/`（9 文件）、`deploy/`（8 文件）、`.agents/skills/`（2 文件），另含母版隔离冒烟流水线 `.github/workflows/workflow-smoke.yml`

## 后续演进建议
- Codex `v1.3.1` 审计全部 22 项（P0/P1/P2）已全部闭环；在具备 Docker 与浏览器环境时执行一次实机 / GitHub Actions `workflow-smoke.yml` 联调即可。
- 面向“团队没人使用 IDE”的长期痛点，下一步可在现有成熟规范底座外挂“去 IDE 异步交付层”。
