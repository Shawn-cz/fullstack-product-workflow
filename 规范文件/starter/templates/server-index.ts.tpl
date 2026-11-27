// @desc Hono 服务端入口（挂载脱敏日志、全局异常处理、/healthz /readyz 探针与生产 SPA 静态服务）
/**
 * 软件产品设计与全栈交付工作流 v1.3.0 — 最小可运行服务端入口骨架
 * 对应规则：STD-ARC-09、STD-API-07、STD-OPS-07、STD-OPS-08
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { PrismaClient } from '@prisma/client'
import { Hono } from 'hono'
import { logger, logUnhandledError, resolveRequestTraceId } from './middleware/logger-trace'
import { buildLivenessPayload, buildReadinessPayload } from './routes/health-probes'

const SERVICE_NAME = process.env.SERVICE_NAME || 'team-fullstack-api'
const APP_VERSION = process.env.APP_VERSION || '0.1.0'

let prismaClient: PrismaClient | null = null
function getPrisma(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient()
  }
  return prismaClient
}

export const app = new Hono()

app.use('*', async (c, next) => {
  const requestTraceId = resolveRequestTraceId(c.req.header('x-request-trace-id'))
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
  const requestTraceId = resolveRequestTraceId(c.req.header('x-request-trace-id'))
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

// 在此处挂载业务 API 路由（示例：app.route('/api/items', itemsRouter)）

app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json(
      {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: '请求的接口不存在。'
        }
      },
      404
    )
  }
  return c.text('Not Found', 404)
})

// 生产环境静态文件与 SPA 路由回退（由 Dockerfile 构建产物 dist/ 提供）
const distDir = path.resolve(process.cwd(), 'dist')
if (fs.existsSync(distDir)) {
  app.use('/assets/*', serveStatic({ root: './dist' }))
  app.get('*', async (c, next) => {
    if (c.req.path.startsWith('/api/') || c.req.path === '/healthz' || c.req.path === '/readyz') {
      return next()
    }
    const indexPath = path.join(distDir, 'index.html')
    if (fs.existsSync(indexPath)) {
      return c.html(fs.readFileSync(indexPath, 'utf8'))
    }
    return next()
  })
}

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
