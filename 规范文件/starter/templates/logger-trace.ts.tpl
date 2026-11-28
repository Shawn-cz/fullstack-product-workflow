// @desc 结构化字段脱敏日志、requestTraceId 全链路追踪与安全异常摘要生成器 (STD-OPS-08 / STD-AUD-02)
/**
 * 软件产品设计与全栈交付工作流 v1.4.0 — 服务端日志与异常指纹中间件底座
 *
 * 核心能力（结构化字段脱敏 + 安全异常摘要，非任意文本语义识别）：
 * 1. 基于 pino 输出结构化 JSON 日志，对常见凭据字段路径进行 `[REDACTED]` 脱敏；
 * 2. 生成或透传 `x-request-trace-id` (`requestTraceId`)，将前端报错提示、HTTP 响应与后端日志 1:1 串联；
 * 3. `computeErrorFingerprint(err, route)` 为同类线上异常生成稳定的 16 位 SHA-256 摘要，并经 `sanitizeErrorMessage` 剔除 URI 凭据与 Bearer Token 后记录白名单摘要。
 */
import { createHash, randomUUID } from 'node:crypto'
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'idToken',
      'secret',
      'apiKey',
      'authorization',
      'cookie',
      'databaseUrl',
      'DATABASE_URL',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.idToken',
      '*.secret',
      '*.apiKey',
      '*.authorization',
      '*.cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'req.body.password',
      'req.body.token',
      'req.body.secret',
      'data.accessToken',
      'data.refreshToken',
      'data.token',
      'data.password'
    ],
    censor: '[REDACTED]'
  },
  base: {
    service: process.env.SERVICE_NAME || 'team-fullstack-api',
    env: process.env.NODE_ENV || 'development'
  },
  timestamp: pino.stdTimeFunctions.isoTime
})

/**
 * 清洗异常消息中可能夹带的数据库连接串凭据、Bearer Token 或敏感键值，仅保留安全摘要
 */
export function sanitizeErrorMessage(rawMessage: string): string {
  return rawMessage
    .replace(/(postgresql|postgres|mysql|redis|https?):\/\/[^:\s/@]+:[^@\s/]+@/gi, '$1://[REDACTED]@')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+\b/gi, 'Bearer [REDACTED]')
    .replace(/\b(password|token|secret|authorization|cookie)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .slice(0, 240)
}

/**
 * 读取或生成单次请求的追踪 ID（与客户端幂等 requestId 严格区分）
 */
export function resolveRequestTraceId(incomingHeader?: string | null): string {
  const cleaned = incomingHeader?.trim()
  if (cleaned && /^[A-Za-z0-9_-]{8,64}$/.test(cleaned)) {
    return cleaned
  }
  return `trc_${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

/**
 * 计算线上异常特征指纹（STD-OPS-08）
 * 去除消息中的动态 UUID、数字 ID 与时间戳，确保同一根因故障聚合为同一个 16 位指纹。
 */
export function computeErrorFingerprint(error: unknown, routeKey: string): string {
  const errName = error instanceof Error ? error.name : 'UnknownError'
  const rawMessage = error instanceof Error ? sanitizeErrorMessage(error.message) : 'NonErrorThrown'
  const normalizedMsg = rawMessage
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.+-Z]+\b/g, '<ISO_TIME>')
    .replace(/\b\d+\b/g, '<NUM>')
    .slice(0, 160)

  const topFrame =
    error instanceof Error && error.stack
      ? (error.stack.split('\n')[1] || '').trim().replace(/:\d+:\d+\)?$/, '')
      : 'no-stack'

  return createHash('sha256')
    .update(`${routeKey}|${errName}|${normalizedMsg}|${topFrame}`, 'utf8')
    .digest('hex')
    .slice(0, 16)
}

/**
 * 统一记录脱敏后的服务端异常安全摘要并返回可写入响应的关联信息
 */
export function logUnhandledError(params: {
  error: unknown
  route: string
  requestTraceId: string
  actorId?: string
}): { requestTraceId: string; errorFingerprint: string } {
  const errorFingerprint = computeErrorFingerprint(params.error, params.route)
  const safeSummary =
    params.error instanceof Error
      ? { name: params.error.name, message: sanitizeErrorMessage(params.error.message) }
      : { name: 'NonErrorThrown', message: 'Unhandled non-Error value thrown' }

  logger.error(
    {
      requestTraceId: params.requestTraceId,
      errorFingerprint,
      route: params.route,
      actorId: params.actorId || 'anonymous',
      err: safeSummary
    },
    'Unhandled server error captured'
  )
  return { requestTraceId: params.requestTraceId, errorFingerprint }
}
