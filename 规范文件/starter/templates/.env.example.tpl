# 本地 PostgreSQL 16 同构数据库连接串（配合 docker-compose.postgres.yml，严禁使用 SQLite）
DATABASE_URL="postgresql://app_user:app_local_dev@localhost:5432/app_dev_db?schema=public"

# 服务端配置（本地复制为 .env 后填入随机值；严禁将真实 .env 提交进 Git）
NODE_ENV="development"
PORT="3001"
SESSION_COOKIE_NAME="app_sid"
SESSION_TTL_HOURS="168"
