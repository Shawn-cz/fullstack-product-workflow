# CI 流水线、本地 Pre-commit 门禁与多人 PR 模板 (`ci/`)

版本：1.2.0｜对应规则：`STD-GOV-05`、`STD-CODE-12`、`STD-SEC-05`、`STD-QA-13`、`STD-AUD-07`、`STD-ARC-09`

本目录提供可由 [starter/init-project.mjs](../starter/README.md) 一键铺入业务项目的本地 PostgreSQL 同构容器、**项目资产索引树自动生成脚本**、**本地 Git Pre-commit 强制前置卡点**、**多人协作 PR 审核模板**与 GitHub Actions 四道硬门禁配置。

## 包含文件与启用步骤

| 文件 | 复制到业务项目的目标路径 | 作用 |
|---|---|---|
| [pre-commit.hook](pre-commit.hook) | `.githooks/pre-commit` | 本地每次 `git commit` 前自动刷新索引树并执行 Gate 1/2（通过 `npm run hooks:install` 一键启用） |
| [pull_request_template.md](pull_request_template.md) | `.github/pull_request_template.md` | 多人协作合并 PR 时的标准核验清单（关联 `REQ/AC`、指纹摘要、黑盒截图、迁移与高风险审计勾选） |
| [build-index-tree.mjs](build-index-tree.mjs) | `scripts/build-index-tree.mjs` | 扫描全仓自动生成 `PROJECT_INDEX_TREE.md` 与 `docs/index-tree.json`，支持 `--check` 校验索引是否过期 |
| [verify-gates.mjs](verify-gates.mjs) | `scripts/verify-gates.mjs` | 本地和 CI 共用的门禁脚本（双向 `REQ/AC` 覆盖核对、索引树新鲜度、安全红线、禁用旧栈与 SHA-256 指纹核对） |
| [github-actions-ci.yml](github-actions-ci.yml) | `.github/workflows/ci.yml` | 每次 Push / PR 自动在 PostgreSQL 16 容器上跑通 Gate 1–4（含 Gate 3d Playwright 自动双账号越权并归档可视化 HTML 报告） |
| [docker-compose.postgres.yml](docker-compose.postgres.yml) | `docker-compose.postgres.yml` | 本地一键启动与 CI/生产完全一致的 PostgreSQL 16 数据库（彻底禁用 SQLite） |

## 零经验成员常用单行命令

1. **启动本地 PostgreSQL 数据库**：
   `docker compose -f docker-compose.postgres.yml up -d`
2. **新增或修改文件后刷新项目语义索引树（`STD-GOV-05`）**：
   `node scripts/build-index-tree.mjs --write`
3. **在本地一键运行门禁自检（Gate 1 + Gate 2 + Gate 4）**：
   `node scripts/verify-gates.mjs --all`
4. **一键清库灌种子并跑通 Playwright 双账号越权验收（`STD-QA-12`）**：
   `npm run test:e2e:fresh`（报告查看：`npm run test:e2e:report`）
5. **打开数据库黑盒可视化界面核对数据**：
   `npx prisma studio`
