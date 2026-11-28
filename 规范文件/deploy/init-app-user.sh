#!/bin/sh
# 软件产品设计与全栈交付工作流 v1.4.0 — PostgreSQL 生产最小权限运行账号初始化脚本 (STD-OPS-07)
# 由 docker-compose.prod.yml 挂载至 /docker-entrypoint-initdb.d/01-init-app-user.sh
# 仅在首次初始化空数据卷时执行；为应用单独创建非超级用户 APP_DB_USER，与迁移管理账号 POSTGRES_USER 隔离。
set -eu

if [ -z "${APP_DB_USER:-}" ] || [ -z "${APP_DB_PASSWORD:-}" ]; then
  echo "❌ [init-app-user] 必须在 .env.production 中提供 APP_DB_USER 与 APP_DB_PASSWORD！" >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v app_user="$APP_DB_USER" \
  -v app_pass="$APP_DB_PASSWORD" \
  -v app_db="$POSTGRES_DB" \
  -v admin_user="$POSTGRES_USER" <<'EOSQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT', :'app_user', :'app_pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user')\gexec

SELECT format('ALTER ROLE %I WITH PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE', :'app_user', :'app_pass')\gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', :'app_db', :'app_user')\gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_user')\gexec
SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', :'app_user')\gexec
SELECT format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', :'app_user')\gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I', :'admin_user', :'app_user')\gexec
SELECT format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I', :'admin_user', :'app_user')\gexec
EOSQL
