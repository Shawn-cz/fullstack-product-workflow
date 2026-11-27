// @desc Hono 服务端入口（统一 requestTraceId、预置 /api/auth/*、/healthz /readyz 探针与生产 SPA 静态服务）
/**
 * 软件产品设计与全栈交付工作流 v1.3.1 — 最小可运行服务端入口骨架
 * 对应规则：STD-ARC-09、STD-API-07、STD-SEC-05、STD-OPS-07、STD-OPS-08
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { PrismaClient } from '@prisma/client'
import { Hono } from 'hono'
import { logger, logUnhandledError, resolveRequestTraceId } from './middleware/logger-trace'
import { createAuthRoutes } from './routes/auth'
import { buildLivenessPayload, buildReadinessPayload } from './routes/health-probes'

const SERVICE_NAME = process.env.SERVICE_NAME || 'team-fullstack-api'
const APP_VERSION = process.env.APP_VERSION || '0.1.0'

type AppVariables = {
  requestTraceId: string
}

let prismaClient: PrismaClient | null = null
export function getPrisma(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient()
  }
  return prismaClient
}

export const app = new Hono<{ Variables: AppVariables }>()

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
  const { errorFingerprint } = logUnhandledError({
    error: err,
    route: `${c.req.method} ${c.req.path}`,
    requestTraceId
  })
  return c.json(
    {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务暂不可用，请稍后重试。',
        requestTraceId,
        errorFingerprint
      }
    },
    500
  )
})

app.get('/healthz', (c) => c.json(buildLivenessPayload(SERVICE_NAME, APP_VERSION), 200))

app.get('/readyz', async (c) => {
  const result = await buildReadinessPayload(SERVICE_NAME, APP_VERSION, () =>
    getPrisma().$queryRaw`SELECT 1`
  )
  return c.json(result.body, result.httpStatus)
})

// 统一业务 API 子路由容器（后续新增业务模块请挂载到 api，避免被下方 SPA 静态回退遮蔽）
export const api = new Hono<{ Variables: AppVariables }>()
api.route('/auth', createAuthRoutes(getPrisma))
// 示例：api.route('/items', itemsRouter)

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
      {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: '请求的接口不存在。',
          requestTraceId: c.get('requestTraceId')
        }
      },
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
  const port = Number(process.env.PORT || 3001)
  serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
    logger.info({ port: info.port, service: SERVICE_NAME }, 'HTTP server listening')
  })
}
