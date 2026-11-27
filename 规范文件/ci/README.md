# CI 流水线、本地 Pre-commit 门禁、PR 模板与仓库维护脚本 (`ci/`)

版本：1.3.0｜对应规则：`STD-GOV-05`、`STD-CODE-12`、`STD-SEC-05`、`STD-QA-13`、`STD-AUD-07`、`STD-ARC-09`

本目录提供可由 [starter/init-project.mjs](../starter/README.md) 铺入业务项目的本地 PostgreSQL 同构容器、项目资产索引树自动生成脚本、本地 Git Pre-commit 钩子、多人协作 PR 审核模板与 GitHub Actions 四道门禁配置，以及工作流母版自身维护脚本 `maintain-workflow.mjs`。

## 包含文件

| 文件 | 目标路径 / 用途 | 说明 |
|---|---|---|
| [pre-commit.hook](pre-commit.hook) | 业务项目 `.githooks/pre-commit` | 提交前自动刷新 `PROJECT_INDEX_TREE.md` 并运行 Gate 2 与 Gate 1（`npm run hooks:install` 启用） |
| [pull_request_template.md](pull_request_template.md) | 业务项目 `.github/pull_request_template.md` | 多人协作合并 PR 时的标准核验清单（关联 `REQ/AC`、指纹摘要、黑盒/Playwright 证据、迁移与高风险审计） |
| [build-index-tree.mjs](build-index-tree.mjs) | 业务项目 `scripts/build-index-tree.mjs` | 扫描全仓自动生成 `PROJECT_INDEX_TREE.md` 与 `docs/index-tree.json`，支持 `--check` 校验新鲜度 |
| [verify-gates.mjs](verify-gates.mjs) | 业务项目 `scripts/verify-gates.mjs` | 本地和 CI 共用门禁脚本：Gate 1（双向 `REQ/AC` 覆盖，S0 空底座豁免测试数）、Gate 2（静态前置防呆，不替代运行时权限测试）、Gate 4（契约/Schema/锁文件/源码树四重指纹校验与 `--lock` 锁定） |
| [github-actions-ci.yml](github-actions-ci.yml) | 业务项目 `.github/workflows/ci.yml` | 每次 Push / PR 在 PostgreSQL 16 容器上跑通 Gate 1–4（含 Gate 3d Playwright 自动双账号越权并归档可视化 HTML 报告） |
| [docker-compose.postgres.yml](docker-compose.postgres.yml) | 业务项目 `docker-compose.postgres.yml` | 本地一键启动与 CI/生产一致的 PostgreSQL 16 数据库（禁用 SQLite） |
| [maintain-workflow.mjs](maintain-workflow.mjs) | **仅工作流母版仓库使用** | `--split-templates` 重拆 T01~T13、`--check` 全仓一致性/断链/体积校验、`--pack` 生成本地打包清单 |

## 零经验成员常用单行命令

1. **首次启用本地 Git Pre-commit 门禁**：`npm run hooks:install`
2. **刷新项目资产语义索引树**：`npm run index:build`
3. **在本地运行门禁检查（Gate 1 + Gate 2 + Gate 4）**：`npm run gates`
4. **验收通过后锁定四重指纹基线（生成 `docs/evidence/fingerprint-lock.json`）**：`npm run gates:lock`
5. **一键清库灌种子并跑通 Playwright 双账号越权验收**：`npm run test:e2e:fresh`（报告查看：`npm run test:e2e:report`）
6. **打开数据库黑盒可视化界面核对数据**：`npm run db:studio`
