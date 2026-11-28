// @desc 前后端同构通用契约基线（纯 Zod，无 Node 内置依赖，React/Vite/Node/RN 均可安全导入） | @api API-000
/**
 * 软件产品设计与全栈交付工作流 v1.4.1 — 同构通用契约包基线 (STD-API-07 / STD-API-08)
 *
 * 注意：本文件严禁导入 node:crypto 等 Node 专属内置模块，以确保 React + Vite 浏览器构建 100% 安全。
 * 服务端同步 SHA-256 载荷指纹计算请从同目录 `./fingerprint.server` 导入 `computePayloadFingerprint`。
 */
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

export interface ApiSuccessEnvelope<T> {
  code: 'OK'
  message: string
  data: T
  requestTraceId: string
  timestamp: string
}

/**
 * 构造符合 createApiResponseSchema 的标准成功响应信封
 */
export function buildApiSuccess<T>(
  data: T,
  requestTraceId: string,
  message: string = 'ok'
): ApiSuccessEnvelope<T> {
  return {
    code: 'OK',
    message,
    data,
    requestTraceId,
    timestamp: new Date().toISOString()
  }
}

/**
 * 构造符合 ApiErrorResponseSchema 的标准错误响应体
 */
export function buildApiError(params: {
  code: Exclude<ErrorCode, 'OK'>
  message: string
  status: number
  requestTraceId: string
  details?: Array<{ field: string; reason: string }>
}): ApiErrorResponse {
  return {
    code: params.code,
    message: params.message,
    requestTraceId: params.requestTraceId,
    timestamp: new Date().toISOString(),
    status: params.status,
    ...(params.details ? { details: params.details } : {})
  }
}

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
 * 统一认证主体与角色契约 (STD-SEC-05)
 */
export const ActorRoleEnum = z.enum(['ADMIN', 'HANDLER', 'MEMBER'])
export type ActorRole = z.infer<typeof ActorRoleEnum>

export const AuthenticatedActorSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  role: ActorRoleEnum,
  sessionId: z.string().min(1)
})

export type AuthenticatedActor = z.infer<typeof AuthenticatedActorSchema>

/**
 * 递归规范化 JSON 值（按键名字典序排序，消除对象属性顺序差异对指纹的影响）
 * 纯 JavaScript 实现，浏览器、React Native 与 Node.js 100% 同构。
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
 * 跨运行时异步 SHA-256 指纹计算器（基于标准 Web Crypto API，浏览器与 Node 20+ 均可用）
 */
export async function computePayloadFingerprintAsync(normalizedPayload: unknown): Promise<string> {
  const canonical = JSON.stringify(canonicalizeJsonValue(normalizedPayload))
  const encoded = new TextEncoder().encode(canonical)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
