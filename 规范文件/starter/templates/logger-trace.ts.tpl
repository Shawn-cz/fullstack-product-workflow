// @desc 结构化脱敏日志、requestTraceId 全链路追踪与线上异常指纹生成器 (STD-OPS-08 / STD-AUD-02)
/**
 * 软件产品设计与全栈交付工作流 v1.3.1 — 服务端日志与异常指纹中间件底座
 *
 * 核心能力：
 * 1. 基于 pino 输出结构化 JSON 日志，内置 sensitive 字段自动脱敏（[REDACTED]），防止密码/Token/Cookie 落盘；
 * 2. 生成或透传 `x-request-trace-id` (`requestTraceId`)，将前端报错提示、HTTP 响应与后端日志 1:1 串联；
 * 3. `computeErrorFingerprint(err, route)` 为同类线上异常生成稳定的 16 位 SHA-256 摘要，便于告警聚合与回归定位。
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
      'secret',
      'authorization',
      'cookie',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.secret',
      'req.headers.authorization',
      'req.headers.cookie'
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
  const rawMessage = error instanceof Error ? error.message : String(error)
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
 * 统一记录脱敏后的服务端异常日志并返回可写入响应的关联信息
 */
export function logUnhandledError(params: {
  error: unknown
  route: string
  requestTraceId: string
  actorId?: string
}): { requestTraceId: string; errorFingerprint: string } {
  const errorFingerprint = computeErrorFingerprint(params.error, params.route)
  logger.error(
    {
      requestTraceId: params.requestTraceId,
      errorFingerprint,
      route: params.route,
      actorId: params.actorId || 'anonymous',
      err: params.error instanceof Error ? { name: params.error.name, message: params.error.message } : String(params.error)
    },
    'Unhandled server error captured'
  )
  return { requestTraceId: params.requestTraceId, errorFingerprint }
}
