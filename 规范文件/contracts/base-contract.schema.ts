/**
 * 软件产品设计与全栈交付工作流 v0.9.0 — 通用契约包基线 (STD-API-07 / STD-API-08)
 *
 * 适用范围：React + TypeScript 前端、Node.js (Hono/Fastify) 服务端、PostgreSQL + Prisma 持久化层，
 * 以及既有/新建移动 App 对接。所有业务接口契约必须继承或组合本基线。
 */
import { createHash } from 'node:crypto'
import { z } from 'zod'

/**
 * 标准业务与 HTTP 映射错误码字典（对齐 RFC 9457 / STD-API-02 / STD-API-07）
 */
export const ErrorCodeEnum = z.enum([
  'OK',
  'VALIDATION_FAILED',                // 422 请求参数或业务规则校验失败
  'UNAUTHENTICATED',                  // 401 未登录或会话/Token 失效
  'FORBIDDEN',                        // 403 已登录但无权执行动作或访问对象
  'NOT_FOUND',                        // 404 资源不存在（或跨用户越权按不可见策略返回 404）
  'CONFLICT_VERSION',                 // 409 乐观锁 expectedVersion 冲突或状态机不允许转换
  'IDEMPOTENCY_FINGERPRINT_MISMATCH', // 409 同一 requestId 但请求载荷 SHA-256 指纹不一致 (STD-API-08)
  'CONFLICT_DUPLICATE',               // 409 业务唯一键冲突
  'RATE_LIMITED',                     // 429 请求过于频繁
  'SERVICE_UNAVAILABLE',              // 503 依赖服务暂不可用
  'INTERNAL_ERROR'                    // 500 服务端未预期错误（禁止泄漏内部堆栈）
])

export type ErrorCode = z.infer<typeof ErrorCodeEnum>

/**
 * 统一成功/业务响应信封
 */
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    code: z.literal('OK'),
    message: z.string().min(1),
    data: dataSchema,
    requestTraceId: z.string().min(1),
    timestamp: z.string().datetime()
  })

/**
 * 统一错误响应体（兼容 RFC 9457 Problem Details 扩展字段）
 */
export const ApiErrorResponseSchema = z.object({
  code: ErrorCodeEnum.exclude(['OK']),
  message: z.string().min(1), // 仅允许可公开的安全提示，禁止包含 SQL/堆栈/密钥
  requestTraceId: z.string().min(1),
  timestamp: z.string().datetime(),
  status: z.number().int().min(400).max(599),
  details: z
    .array(
      z.object({
        field: z.string(),
        reason: z.string()
      })
    )
    .optional()
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

/**
 * 统一分页请求与响应契约
 */
export const PageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().trim().min(1).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type PageQuery = z.infer<typeof PageQuerySchema>

export const createPagedDataSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalPages: z.number().int().nonnegative()
  })

/**
 * 乐观锁与幂等通用字段契约 (STD-BIZ-04 / STD-API-08)
 */
export const OptimisticLockSchema = z.object({
  expectedVersion: z.number().int().positive()
})

export const IdempotencyKeySchema = z.object({
  requestId: z.string().uuid()
})

/**
 * 递归规范化 JSON 值（按键名字典序排序，消除对象属性顺序差异对指纹的影响）
 */
export function canonicalizeJsonValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }
  if (Array.isArray(value)) {
    return value.map(canonicalizeJsonValue)
  }
  const sortedEntries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const result: Record<string, unknown> = {}
  for (const [key, val] of sortedEntries) {
    result[key] = canonicalizeJsonValue(val)
  }
  return result
}

/**
 * 计算请求载荷的确定性 SHA-256 指纹 (STD-API-08)
 *
 * 规则：
 * 1. 先经 Zod parse 去除未知字段并完成 trim 等规范化；
 * 2. 排除 requestId 本身（若存在于 body）后对规范化 JSON 排序序列化；
 * 3. 返回 64 位小写十六进制 SHA-256 摘要，与 requestId 共同决定重放或 409 冲突。
 */
export function computePayloadFingerprint(normalizedPayload: unknown): string {
  const canonical = JSON.stringify(canonicalizeJsonValue(normalizedPayload))
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}
