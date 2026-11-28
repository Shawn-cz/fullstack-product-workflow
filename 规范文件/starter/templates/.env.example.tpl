# 本地 PostgreSQL 16 同构数据库连接串（配合 docker-compose.postgres.yml，严禁使用 SQLite）
# 本机并行多个项目时可修改 POSTGRES_PORT（如 5433）并同步更新下方连接串端口
POSTGRES_PORT="5432"
DATABASE_URL="postgresql://app_user:app_local_dev@127.0.0.1:5432/app_dev_db?schema=public"

# 独立的 E2E 测试数据库（运行 npm run test:e2e:fresh 时强制使用，严禁回退清空日常开发库）
TEST_DATABASE_URL="postgresql://app_user:app_local_dev@127.0.0.1:5432/app_test_db?schema=public"

# 服务端与前端端口配置（本地复制为 .env；严禁将真实 .env 提交进 Git）
NODE_ENV="development"
PORT="3001"
FRONTEND_PORT="5173"
ALLOWED_ORIGINS=""
SESSION_COOKIE_NAME="app_sid"
SESSION_TTL_HOURS="168"
AUTH_LOGIN_RATE_LIMIT_MAX="10"
AUTH_LOGIN_RATE_LIMIT_WINDOW_MS="60000"
