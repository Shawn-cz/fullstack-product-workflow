# S8 生产部署、自动 HTTPS 与数据库备份恢复包 (`deploy/`)

版本：1.3.0｜对应规则：`STD-OPS-01~07`、`STD-DAT-04`、`STD-QA-12`

## 包含文件

| 文件 | 复制到业务项目目标路径 | 用途 |
|---|---|---|
| [Dockerfile](Dockerfile) | `Dockerfile` | 多阶段构建（React `dist/` + 预编译 `dist-server/index.mjs` + 版本锁定 Prisma CLI + 非 root `USER node` + `/healthz` 内置探针） |
| [docker-compose.prod.yml](docker-compose.prod.yml) | `docker-compose.prod.yml` | 生产三容器编排（Caddy 自动 HTTPS + App + 仅内网隔离的 PostgreSQL 16），统一使用 `--env-file .env.production` |
| [Caddyfile](Caddyfile) | `Caddyfile` | 自动申请/续期 Let's Encrypt HTTPS 证书与安全响应头配置 |
| [health-probes.ts.tpl](health-probes.ts.tpl) | `server/routes/health-probes.ts` | `/healthz`（进程存活）与 `/readyz`（PostgreSQL `SELECT 1` 就绪校验）双探针 |
| [backup-postgres.mjs](backup-postgres.mjs) | `scripts/backup-postgres.mjs` | 跨平台 PostgreSQL 一键备份（附 `.sha256` 校验文件）与带安全护栏的恢复脚本 |

## 生产环境变量统一约定（只维护 `.env.production` 一份文件）

为避免 Docker Compose 插值读取 `.env` 与容器读取 `.env.production` 产生双份配置漂移，生产服务器只需维护项目根目录下的 **`.env.production`**（已加入 `.gitignore`，禁止提交 Git），包含以下必填项：
- `APP_DOMAIN`（如 `app.example.com`）
- `POSTGRES_USER`、`POSTGRES_PASSWORD`（高熵随机密码）、`POSTGRES_DB`
- `SESSION_COOKIE_NAME`（如 `app_sid`）、`SESSION_TTL_HOURS`（如 `168`）

## 零经验团队 S8 生产上线 5 步安全操作卡

1. **前置确认（无授权不发布）**：确认 `T12` 四道门禁全绿、已运行 `npm run gates:lock` 锁定指纹基线，并已取得团队负责人 `S8` 发布签字与独立审计确认（`STD-QA-12`）。
2. **迁移前先做数据库备份**：
   `node scripts/backup-postgres.mjs --backup --container prod_postgres --user <user> --db <db>`
   将生成的 `.sql` 路径及 `.sha256` 摘要登记入 `T09`。
3. **部署新版本与数据库迁移**：
   - 在生产服务器核对 `.env.production`；
   - 执行 `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build`；
   - 执行 `docker exec prod_app npx prisma migrate deploy`（运行镜像已内置版本锁定 `prisma`，无需联网下载）。
4. **发布后黑盒探针与核心路径验证**：
   - 访问 `https://<你的域名>/healthz` 与 `https://<你的域名>/readyz`，确认均返回 `200` 且 `"database": "up"`；
   - 用测试账号完成 1 条核心业务路径并检查 `T09` 发布后指标与脱敏日志。
5. **异常紧急回滚（代码 + 数据库）**：
   - 代码回退：切回上一个已验收的 Git Tag 重新执行 `docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build`；
   - 若涉及不可逆库变更需还原备份：`node scripts/backup-postgres.mjs --restore ./backups/<file>.sql --confirm-restore --container prod_postgres`。
