// @desc Hono 服务端入口（环境校验、CSRF/Origin 防护、requestTraceId、/api/auth/*、protectedApi RBAC 容器与 Schema 就绪探针）
/**
 * 软件产品设计与全栈交付工作流 v1.4.1 — 最小可运行服务端入口骨架
 * 对应规则：STD-ARC-09、STD-API-07、STD-SEC-05、STD-OPS-07、STD-OPS-08
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { PrismaClient } from '@prisma/client'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { csrf } from 'hono/csrf'
import { buildApiError } from '../shared/contracts/base-contract.schema'
import { getServerEnv, resolveAllowedOrigins, resolveDatabaseUrl } from './config/env'
import { createRequireAuth, type AuthVariables } from './middleware/auth-rbac'
import { logger, logUnhandledError, resolveRequestTraceId } from './middleware/logger-trace'
import { createAuthRoutes } from './routes/auth'
import { buildLivenessPayload, buildReadinessPayload } from './routes/health-probes'

const env = getServerEnv()
const SERVICE_NAME = env.SERVICE_NAME
const APP_VERSION = env.APP_VERSION
const ALLOWED_ORIGINS = resolveAllowedOrigins(env)

let prismaClient: PrismaClient | null = null
export function getPrisma(): PrismaClient {
  if (!prismaClient) {
    const dbUrl = resolveDatabaseUrl(getServerEnv())
    prismaClient = dbUrl
      ? new PrismaClient({ datasources: { db: { url: dbUrl } } })
      : new PrismaClient()
  }
  return prismaClient
}

export const app = new Hono<{ Variables: AuthVariables }>()

app.use('*', async (c, next) => {
  const requestTraceId = resolveRequestTraceId(c.req.header('x-request-trace-id'))
  c.set('requestTraceId', requestTraceId)
  c.header('x-request-trace-id', requestTraceId)
  const startedAt = Date.now()
  await next()
  logger.info(
    {
      requestTraceId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt
    },
    'HTTP request completed'
  )
})

app.onError((err, c) => {
  const requestTraceId =
    c.get('requestTraceId') || resolveRequestTraceId(c.req.header('x-request-trace-id'))
  c.header('x-request-trace-id', requestTraceId)
  logUnhandledError({
    error: err,
    route: `${c.req.method} ${c.req.path}`,
    requestTraceId,
    actorId: c.get('actor')?.id
  })
  return c.json(
    buildApiError({
      code: 'INTERNAL_ERROR',
      message: '服务暂不可用，请稍后重试。',
      status: 500,
      requestTraceId
    }),
    500
  )
})

app.get('/healthz', (c) => c.json(buildLivenessPayload(SERVICE_NAME, APP_VERSION), 200))

app.get('/readyz', async (c) => {
  const result = await buildReadinessPayload(SERVICE_NAME, APP_VERSION, async () => {
    const prisma = getPrisma()
    await prisma.$queryRaw`SELECT 1`
    // 确认核心表已迁移就绪，避免空库迁移未完成前放行线上流量
    const rows = await prisma.$queryRaw<Array<{ tbl: string | null }>>`
      SELECT to_regclass('public."User"')::text AS tbl
    `
    if (!rows[0]?.tbl) {
      throw new Error('Database schema not initialized (missing table User)')
    }
  })
  return c.json(result.body, result.httpStatus)
})

// 统一业务 API 子路由容器（挂载大小限制、Hono CSRF 与写请求可信 Origin 防护）
export const api = new Hono<{ Variables: AuthVariables }>()

api.use(
  '*',
  bodyLimit({
    maxSize: 1024 * 1024,
    onError: (c) =>
      c.json(
        buildApiError({
          code: 'VALIDATION_FAILED',
          message: '请求体大小超过 1MB 上限。',
          status: 413,
          requestTraceId: c.get('requestTraceId') || 'trc_missing'
        }),
        413
      )
  })
)

api.use('*', csrf({ origin: ALLOWED_ORIGINS }))

api.use('*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && c.req.method !== 'OPTIONS') {
    const origin = c.req.header('origin')
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return c.json(
        buildApiError({
          code: 'FORBIDDEN',
          message: '拒绝来自未受信任来源的跨站写请求。',
          status: 403,
          requestTraceId: c.get('requestTraceId') || 'trc_missing'
        }),
        403
      )
    }
  }
  await next()
})

// 公开认证入口（/api/auth/login|logout|me）
api.route('/auth', createAuthRoutes(getPrisma))

// 受保护业务 API 容器（默认强制经过第一层 requireAuth 认证拦截；后续业务模块请挂载到 protectedApi 并叠加 requireRole / assertOwnerOrRole）
export const protectedApi = new Hono<{ Variables: AuthVariables }>()
protectedApi.use(
  '*',
  createRequireAuth(getPrisma, () => getServerEnv().SESSION_COOKIE_NAME)
)
// 示例：protectedApi.route('/items', itemsRouter)
api.route('/', protectedApi)

app.route('/api', api)

// 生产环境静态文件与 SPA 路由回退（由 Dockerfile 构建产物 dist/ 提供，启动时预读 index.html 避免同步磁盘阻塞）
const distDir = path.resolve(process.cwd(), 'dist')
const indexHtmlPath = path.join(distDir, 'index.html')
const cachedIndexHtml = fs.existsSync(indexHtmlPath) ? fs.readFileSync(indexHtmlPath, 'utf8') : null

if (cachedIndexHtml !== null) {
  app.use('/assets/*', serveStatic({ root: './dist' }))
  app.get('*', async (c, next) => {
    if (c.req.path.startsWith('/api/') || c.req.path === '/healthz' || c.req.path === '/readyz') {
      return next()
    }
    return c.html(cachedIndexHtml)
  })
}

app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json(
      buildApiError({
        code: 'NOT_FOUND',
        message: '请求的接口不存在。',
        status: 404,
        requestTraceId: c.get('requestTraceId') || 'trc_missing'
      }),
      404
    )
  }
  return c.text('Not Found', 404)
})

const entryArg = process.argv[1]
const isMain =
  entryArg !== undefined &&
  path.resolve(entryArg) === path.resolve(fileURLToPath(import.meta.url))

if (isMain) {
  serve({ fetch: app.fetch, port: env.PORT, hostname: '0.0.0.0' }, (info) => {
    logger.info({ port: info.port, service: SERVICE_NAME }, 'HTTP server listening')
  })
}
