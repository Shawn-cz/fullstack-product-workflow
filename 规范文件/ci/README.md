# CI 流水线、本地 Pre-commit 门禁、PR 模板与仓库维护脚本 (`ci/`)

版本：1.4.0｜对应规则：`STD-GOV-05`、`STD-CODE-12`、`STD-SEC-05`、`STD-QA-13`、`STD-AUD-07`、`STD-ARC-09`

本目录提供可由 [starter/init-project.mjs](../starter/README.md) 铺入业务项目的本地 PostgreSQL 同构容器（无固定容器名，支持多项目并行）、项目资产索引树自动生成脚本、**跨平台 Node 本地 Git Pre-commit 钩子**、多人协作 PR 审核模板与 GitHub Actions 四道门禁配置，以及工作流母版自身维护脚本 `maintain-workflow.mjs`。

## 包含文件

| 文件 | 目标路径 / 用途 | 说明 |
|---|---|---|
| [pre-commit.hook](pre-commit.hook) | 业务项目 `.githooks/pre-commit` | 跨平台纯 Node 只读门禁，提交前检查部分提交未暂存漂移、索引树新鲜度与 Gate 2/1（提示显式刷新，不自动 `git add`；`npm run hooks:install` 启用） |
| [pull_request_template.md](pull_request_template.md) | 业务项目 `.github/pull_request_template.md` | 多人协作合并 PR 时的标准核验清单（关联 `REQ/AC`、指纹摘要、黑盒/Playwright 证据、迁移与高风险审计） |
| [build-index-tree.mjs](build-index-tree.mjs) | 业务项目 `scripts/build-index-tree.mjs` | 扫描全仓自动生成 `PROJECT_INDEX_TREE.md` 与 `docs/index-tree.json`（文本 CRLF 自动归一化 LF），支持 `--check` 校验新鲜度 |
| [verify-gates.mjs](verify-gates.mjs) | 业务项目 `scripts/verify-gates.mjs` | 本地和 CI 共用门禁脚本（POSIX 路径排序 + LF 归一化）：Gate 1（双向 `REQ/AC`、空文档禁幽灵编号，支持 `--scope=minor`）、Gate 2（静态防呆，支持 `.workflow-profile.json` 裁剪）、Gate 4（五重指纹与 `--strict-lock`） |
| [github-actions-ci.yml](github-actions-ci.yml) | 业务项目 `.github/workflows/ci.yml` | 每次 Push / PR 在 Node 22 + PostgreSQL 16 容器上跑通 Gate 1–4（统一测试发现 + S2+ 无测试阻断 + Gate 3d Playwright 自动越权） |
| [docker-compose.postgres.yml](docker-compose.postgres.yml) | 业务项目 `docker-compose.postgres.yml` | 本地一键启动仅绑定 `127.0.0.1` 的 PostgreSQL 16 数据库（支持 `POSTGRES_PORT` 多项目并行，`npm run db:up` 带 `--wait` 等待健康就绪） |
| [maintain-workflow.mjs](maintain-workflow.mjs) | **仅工作流母版仓库使用** | `--split-templates` 重拆 T01~T13、`--check` **母版结构检查**（脚本语法/自检、断链、CRLF/体积/动态计数）、`--pack` 生成本地打包清单；生成底座编译/认证/Docker 冒烟验证见仓库 [workflow-smoke.yml](../../.github/workflows/workflow-smoke.yml) |

## 零经验成员常用单行命令

1. **首次启用本地 Git Pre-commit 门禁**：`npm run hooks:install`
2. **刷新项目资产语义索引树**：`npm run index:build`
3. **在本地运行门禁检查（Gate 1 + Gate 2 + Gate 4）**：`npm run gates`
4. **验收通过后锁定五重指纹基线（生成 `docs/evidence/fingerprint-lock.json`）**：`npm run gates:lock`
5. **一键清库灌种子并跑通 Playwright 双账号越权验收**：`npm run test:e2e:fresh`（报告查看：`npm run test:e2e:report`）
6. **打开数据库黑盒可视化界面核对数据**：`npm run db:studio`
