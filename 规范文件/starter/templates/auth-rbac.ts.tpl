// @desc 服务端三层 RBAC Hono 中间件、异步密码校验与对象归属权限守卫 (STD-SEC-05)
/**
 * 软件产品设计与全栈交付工作流 v1.4.0 — 认证与三层 RBAC 权限中间件模板
 *
 * 三层强制拦截顺序：
 *   1. createRequireAuth()   → Hono 中间件，校验 HttpOnly Cookie 对应的 PostgreSQL 未吊销 Session，挂载 actor，失败返回 401
 *   2. requireRole([...])    → Hono 中间件，校验 actor.role 是否在白名单，失败返回 403
 *   3. assertOwnerOrRole()   → 对象数据范围校验（默认特权角色为空 []，由业务显式传入），跨用户越权按策略返回 404 或 403
 */
import { createHash, randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import {
  buildApiError,
  type ActorRole,
  type AuthenticatedActor
} from '../../shared/contracts/base-contract.schema'

export type AuthVariables = {
  requestTraceId: string
  actor?: AuthenticatedActor
}

export interface SessionLookupResult {
  sessionId: string
  expiresAt: Date
  revokedAt: Date | null
  user: {
    id: string
    email: string
    role: ActorRole
    isActive: boolean
  }
}

export interface AuthErrorShape {
  status: 401 | 403 | 404
  code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND'
  message: string
}

// 预计算占位哈希，确保未知邮箱登录时也执行同等成本的 scrypt 计算以防时序枚举
const DUMMY_SALT = '00112233445566778899aabbccddeeff'
const DUMMY_KEY_HEX = '00'.repeat(64)

function scryptAsync(plainPassword: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(plainPassword, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      else resolve(derivedKey)
    })
  })
}

/**
 * 强密码哈希（同步版，供 seed 脚本使用；Node 原生 scrypt + 16 字节随机盐）
 */
export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(plainPassword, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

/**
 * 强密码哈希（异步版，供 Web 请求线程使用，避免阻塞事件循环）
 */
export async function hashPasswordAsync(plainPassword: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scryptAsync(plainPassword, salt)).toString('hex')
  return `${salt}:${derived}`
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':')
  if (!salt || !keyHex) return false
  const derived = scryptSync(plainPassword, salt, 64)
  const storedBuf = Buffer.from(keyHex, 'hex')
  if (derived.length !== storedBuf.length) return false
  return timingSafeEqual(derived, storedBuf)
}

export async function verifyPasswordAsync(plainPassword: string, storedHash: string): Promise<boolean> {
  const [salt, keyHex] = storedHash.split(':')
  if (!salt || !keyHex) return false
  const derived = await scryptAsync(plainPassword, salt)
  const storedBuf = Buffer.from(keyHex, 'hex')
  if (derived.length !== storedBuf.length) return false
  return timingSafeEqual(derived, storedBuf)
}

/**
 * 恒定时间异步密码核验：即使账号不存在也执行一次 scrypt 派生，防止时序差异暴露账号是否存在
 */
export async function verifyPasswordConstantTime(
  plainPassword: string,
  storedHash: string | null | undefined
): Promise<boolean> {
  if (!storedHash) {
    const derived = await scryptAsync(plainPassword, DUMMY_SALT)
    const dummyBuf = Buffer.from(DUMMY_KEY_HEX, 'hex')
    timingSafeEqual(derived, dummyBuf)
    return false
  }
  return verifyPasswordAsync(plainPassword, storedHash)
}

/**
 * 对随机 Session Token 计算 SHA-256 哈希后再落库（防数据库泄漏时直接冒用会话）
 */
export function hashSessionToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex')
}

/**
 * 生成安全的 HttpOnly 会话 Cookie 头属性
 */
export function buildSessionCookieOptions(isProd: boolean, maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax' as const,
    path: '/',
    maxAge: maxAgeSeconds
  }
}

/**
 * 第一层校验纯函数：将查库结果转为可信 AuthenticatedActor，否则返回 401 错误结构
 */
export function resolveAuthenticatedActor(
  session: SessionLookupResult | null,
  now: Date = new Date()
): { ok: true; actor: AuthenticatedActor } | { ok: false; error: AuthErrorShape } {
  if (!session || session.revokedAt !== null || session.expiresAt <= now || !session.user.isActive) {
    return {
      ok: false,
      error: {
        status: 401,
        code: 'UNAUTHENTICATED',
        message: '登录状态已失效或未登录，请重新登录。'
      }
    }
  }
  return {
    ok: true,
    actor: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      sessionId: session.sessionId
    }
  }
}

/**
 * 第二层校验纯函数：角色动作白名单校验（默认拒绝，否则返回 403）
 */
export function checkRolePermission(
  actor: AuthenticatedActor,
  allowedRoles: readonly ActorRole[]
): { ok: true } | { ok: false; error: AuthErrorShape } {
  if (!allowedRoles.includes(actor.role)) {
    return {
      ok: false,
      error: {
        status: 403,
        code: 'FORBIDDEN',
        message: '当前角色无权执行此操作。'
      }
    }
  }
  return { ok: true }
}

/**
 * 第三层校验：对象数据范围校验（默认仅本人放行，特权角色须由具体业务显式声明，默认跨用户返回 404 防探测）
 */
export function checkObjectScope(
  actor: AuthenticatedActor,
  ownerId: string,
  privilegedRoles: readonly ActorRole[] = [],
  hideExistence: boolean = true
): { ok: true } | { ok: false; error: AuthErrorShape } {
  if (ownerId === actor.id || privilegedRoles.includes(actor.role)) {
    return { ok: true }
  }
  return {
    ok: false,
    error: hideExistence
      ? { status: 404, code: 'NOT_FOUND', message: '目标资源不存在或无权查看。' }
      : { status: 403, code: 'FORBIDDEN', message: '无权访问他人数据。' }
  }
}

export const assertOwnerOrRole = checkObjectScope

/**
 * 第一层 Hono 中间件：校验 HttpOnly Cookie 对应的未吊销 PostgreSQL Session 并挂载 actor
 */
export function createRequireAuth(
  getPrisma: () => PrismaClient,
  getCookieName: () => string = () => process.env.SESSION_COOKIE_NAME || 'app_sid'
): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    const requestTraceId = c.get('requestTraceId') || 'trc_missing'
    const rawToken = getCookie(c, getCookieName())
    if (!rawToken) {
      return c.json(
        buildApiError({
          code: 'UNAUTHENTICATED',
          message: '登录状态已失效或未登录，请重新登录。',
          status: 401,
          requestTraceId
        }),
        401
      )
    }

    const tokenHash = hashSessionToken(rawToken)
    const sessionRow = await getPrisma().session.findUnique({
      where: { tokenHash },
      include: { user: true }
    })

    const resolved = resolveAuthenticatedActor(
      sessionRow
        ? {
            sessionId: sessionRow.id,
            expiresAt: sessionRow.expiresAt,
            revokedAt: sessionRow.revokedAt,
            user: {
              id: sessionRow.user.id,
              email: sessionRow.user.email,
              role: sessionRow.user.role,
              isActive: sessionRow.user.isActive
            }
          }
        : null
    )

    if (!resolved.ok) {
      return c.json(
        buildApiError({
          code: resolved.error.code,
          message: resolved.error.message,
          status: resolved.error.status,
          requestTraceId
        }),
        resolved.error.status
      )
    }

    c.set('actor', resolved.actor)
    await next()
  }
}

/**
 * 第二层 Hono 中间件：校验已认证主体的角色是否在允许白名单内
 */
export function requireRole(
  allowedRoles: readonly ActorRole[]
): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    const requestTraceId = c.get('requestTraceId') || 'trc_missing'
    const actor = c.get('actor')
    if (!actor) {
      return c.json(
        buildApiError({
          code: 'UNAUTHENTICATED',
          message: '登录状态已失效或未登录，请重新登录。',
          status: 401,
          requestTraceId
        }),
        401
      )
    }
    const perm = checkRolePermission(actor, allowedRoles)
    if (!perm.ok) {
      return c.json(
        buildApiError({
          code: perm.error.code,
          message: perm.error.message,
          status: perm.error.status,
          requestTraceId
        }),
        perm.error.status
      )
    }
    await next()
  }
}
