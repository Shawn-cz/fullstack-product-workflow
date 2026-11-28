# S8 生产部署、自动 HTTPS 与数据库备份恢复包 (`deploy/`)

版本：1.4.0｜对应规则：`STD-OPS-01~07`、`STD-DAT-04`、`STD-QA-12`

## 包含文件

| 文件 | 复制到业务项目目标路径 | 用途 |
|---|---|---|
| [Dockerfile](Dockerfile) | `Dockerfile` | 基于 `node:22-alpine` 多阶段构建（React `dist/` + 预编译 `dist-server/index.mjs` + `scripts/run-migrate.mjs` + 版本锁定 Prisma CLI + 非 root `USER node` + `/healthz` 内置探针） |
| [docker-compose.prod.yml](docker-compose.prod.yml) | `docker-compose.prod.yml` | 生产四服务编排（Caddy 自动 HTTPS → App〔最小权限 `APP_DB_USER`〕→ 一次性 `migrate` 先迁移后启动 → 内网隔离 PostgreSQL 16） |
| [init-app-user.sh](init-app-user.sh) | `deploy/init-app-user.sh` | 容器首次建库时创建非超级用户 `APP_DB_USER`，与迁移管理账号 `POSTGRES_USER` 权限隔离（含未来表默认授权） |
| [run-migrate.mjs](run-migrate.mjs) | `scripts/run-migrate.mjs` | 在应用启动前执行 `prisma migrate deploy`（URL percent-encoding 特殊字符密码，迁移失败立即中止发布） |
| [Caddyfile](Caddyfile) | `Caddyfile` | 自动申请/续期 Let's Encrypt HTTPS 证书与安全响应头配置 |
| [health-probes.ts.tpl](health-probes.ts.tpl) | `server/routes/health-probes.ts` | `/healthz`（进程存活）与 `/readyz`（PostgreSQL `SELECT 1` + 核心表 `User` 就绪校验）双探针 |
| [backup-postgres.mjs](backup-postgres.mjs) | `scripts/backup-postgres.mjs` | 强制 `--env dev|prod` 隔离目标库、流式 `pg_dump`（无 256MB 内存上限）与 `--single-transaction` 单事务原子恢复脚本 |

## 生产环境变量统一约定（只维护 `.env.production` 一份文件）

生产服务器只需维护项目根目录下的 **`.env.production`**（已加入 `.gitignore`，禁止提交 Git），包含以下必填项：
- `APP_DOMAIN`（如 `app.example.com`）
- 迁移管理账号：`POSTGRES_USER`、`POSTGRES_PASSWORD`（高熵随机密码，仅 `postgres` 初始化与 `migrate` 容器使用）
- 应用运行账号：`APP_DB_USER`、`APP_DB_PASSWORD`（最小权限非超级用户，仅 `app` 运行时容器使用，支持含 `/` `#` `@` 的强密码）
- `POSTGRES_DB`、`SESSION_COOKIE_NAME`（如 `app_sid`）、`SESSION_TTL_HOURS`（如 `168`）

## 零经验团队 S8 生产上线 5 步安全操作卡

1. **前置确认（无授权不发布）**：确认 `T12` 全部门禁全绿、已运行 `npm run gates:lock` 锁定五重指纹基线，并已取得团队负责人 `S8` 发布签字与独立审计确认（`STD-QA-12`）。
2. **迁移前先做生产数据库流式备份**：
   `npm run db:backup:prod`（等价 `node scripts/backup-postgres.mjs --backup --env prod`）
   确认终端打印 `env=prod (source=.env.production)` 并登记 `.sql` 与 `.sha256` 摘要入 `T09`。
3. **先迁移再放行应用流量**：
   - 在生产服务器核对 `.env.production`；
   - 执行 `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build`（Compose 会自动先运行一次性 `migrate` 服务完成 `prisma migrate deploy` 并成功退出，再启动 `app` 接受 `/readyz` 与 Caddy 流量）；
   - *若含删表/改列等不兼容结构变更，须采用扩展-收缩兼容迁移或在维护窗口停流量执行*。
4. **发布后黑盒探针与核心路径验证**：
   - 访问 `https://<你的域名>/healthz` 与 `https://<你的域名>/readyz`，确认均返回 `200` 且 `"database": "up"`；
   - 用测试账号完成 1 条核心业务路径并检查 `T09` 发布后指标与脱敏日志。
5. **异常紧急回滚（代码 + 单事务数据库恢复）**：
   - 代码回退：切回上一个已验收的 Git Tag 重新执行 `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build`；
   - 若涉及不可逆库变更需还原备份：`node scripts/backup-postgres.mjs --restore ./backups/<file>.sql --env prod --confirm-restore`（强制校验 `.sha256` 并以 `--single-transaction` 原子执行）。
