# CI 流水线、项目索引树生成器与四道自动化硬门禁 (`ci/`)

版本：0.9.1｜对应规则：`STD-GOV-05`、`STD-QA-13`、`STD-AUD-07`、`STD-ARC-09`

本目录提供可直接在业务项目复用的本地 PostgreSQL 同构容器、**项目资产索引树自动生成脚本**与 GitHub Actions 四道门禁配置，避免出现“AI 跨会话失忆重复造轮子、代码写完但无法通过构建、用 `.skip` 假装测试全绿、拿旧版本报告冒充新版验收”等情况。

## 包含文件与启用步骤

| 文件 | 复制到业务项目的目标路径 | 作用 |
|---|---|---|
| [build-index-tree.mjs](build-index-tree.mjs) | `scripts/build-index-tree.mjs` | 扫描全仓自动生成 `PROJECT_INDEX_TREE.md` 与 `docs/index-tree.json`，支持 `--check` 校验索引是否过期 |
| [verify-gates.mjs](verify-gates.mjs) | `scripts/verify-gates.mjs` | 本地和 CI 共用的门禁脚本（闭环 `@req/@ac`、索引树新鲜度、防作弊与禁用旧栈扫描、SHA-256 指纹核对） |
| [github-actions-ci.yml](github-actions-ci.yml) | `.github/workflows/ci.yml` | 每次 Push / PR 自动在 PostgreSQL 16 容器上跑通 Gate 1–4 |
| [docker-compose.postgres.yml](docker-compose.postgres.yml) | `docker-compose.postgres.yml` | 本地一键启动与 CI/生产完全一致的 PostgreSQL 16 数据库（彻底禁用 SQLite） |

## 零经验成员常用单行命令

1. **启动本地 PostgreSQL 数据库**：
   `docker compose -f docker-compose.postgres.yml up -d`
2. **新增或修改文件后刷新项目语义索引树（`STD-GOV-05`）**：
   `node scripts/build-index-tree.mjs --write`
3. **在本地一键运行门禁自检（Gate 1 + Gate 2 + Gate 4）**：
   `node scripts/verify-gates.mjs --all`
4. **打开数据库黑盒可视化界面核对数据**：
   `npx prisma studio`
