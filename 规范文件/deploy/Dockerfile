# 软件产品设计与全栈交付工作流 v1.1.0 — 生产多阶段 Dockerfile (STD-OPS-05 / STD-OPS-07)
# 特点：干净环境可重建、构建与运行分离、生成 Prisma Client、非 root 用户运行、内置 /healthz 探针

# ============================================================
# Stage 1: Dependencies & Build (React + TypeScript + Prisma)
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ============================================================
# Stage 2: Minimal Production Runtime (Non-root USER node)
# ============================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# 仅安装生产依赖，避免 devDependencies 增大攻击面
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared

# 非 root 运行用户（安全最小权限原则）
RUN chown -R node:node /app
USER node

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/healthz || exit 1

# 启动前先应用安全迁移（或由独立发布步骤先执行 prisma migrate deploy）
CMD ["npx", "tsx", "server/index.ts"]
