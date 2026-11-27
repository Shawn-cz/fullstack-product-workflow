// @desc 服务端三层 RBAC 认证、会话校验与对象归属权限中间件骨架 (STD-SEC-05)
/**
 * 软件产品设计与全栈交付工作流 v1.3.0 — 认证与三层 RBAC 权限中间件模板
 *
 * 三层强制拦截顺序：
 *   1. requireAuth()         → 校验 HttpOnly Cookie 对应的 PostgreSQL 未吊销 Session，失败返回 401
 *   2. requireRole([...])    → 校验 actor.role 是否在白名单，失败返回 403
 *   3. assertOwnerOrRole()   → 校验对象数据范围归属，跨用户越权按策略返回 404 或 403
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { ActorRole, AuthenticatedActor } from '../../shared/contracts/base-contract.schema'

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

/**
 * 强密码哈希（Node 原生 scrypt + 16 字节随机盐）
 */
export function hashPassword(plainPassword: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(plainPassword, salt, 64).toString('hex')
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
 * 第一层：认证校验（将查库结果转为可信 AuthenticatedActor，否则抛出 401）
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
 * 第二层：角色动作白名单校验（默认拒绝，否则返回 403）
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
 * 第三层：对象数据范围校验（本人归属或特权角色放行，默认跨用户返回 404 防探测）
 */
export function checkObjectScope(
  actor: AuthenticatedActor,
  ownerId: string,
  privilegedRoles: readonly ActorRole[] = ['ADMIN', 'HANDLER'],
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
