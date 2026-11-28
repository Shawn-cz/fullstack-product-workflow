// @desc 服务端标准认证路由（/api/auth/login、/logout、/me；对齐共享契约、限流、恒定时间核验与严格吊销，STD-SEC-05）
/**
 * 软件产品设计与全栈交付工作流 v1.4.1 — 与 Playwright auth-contexts.ts 及 base-contract.schema.ts 对齐的认证路由
 * 对应规则：STD-SEC-05、STD-API-07、STD-QA-12
 */
import { randomBytes } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { z } from 'zod'
import { buildApiError, buildApiSuccess } from '../../shared/contracts/base-contract.schema'
import { getServerEnv } from '../config/env'
import {
  buildSessionCookieOptions,
  hashSessionToken,
  resolveAuthenticatedActor,
  verifyPasswordConstantTime,
  type AuthVariables
} from '../middleware/auth-rbac'
import { logUnhandledError } from '../middleware/logger-trace'

const LoginPayloadSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
})

interface RateBucket {
  count: number
  resetAt: number
}

const rateBuckets = new Map<string, RateBucket>()

function consumeRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets.entries()) {
      if (v.resetAt <= now) rateBuckets.delete(k)
    }
  }
  if (rateBuckets.size >= 10000) {
    const oldest = rateBuckets.keys().next().value
    if (oldest !== undefined) rateBuckets.delete(oldest)
  }
  const existing = rateBuckets.get(key)
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (existing.count >= maxRequests) {
    return false
  }
  existing.count++
  return true
}

function getClientIp(c: { req: { header: (name: string) => string | undefined } }): string {
  const xff = c.req.header('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  return c.req.header('x-real-ip')?.trim() || 'unknown'
}

export function createAuthRoutes(getPrisma: () => PrismaClient) {
  const auth = new Hono<{ Variables: AuthVariables }>()

  auth.use(
    '*',
    bodyLimit({
      maxSize: 16 * 1024,
      onError: (c) =>
        c.json(
          buildApiError({
            code: 'VALIDATION_FAILED',
            message: '请求体过大，已拒绝处理。',
            status: 413,
            requestTraceId: c.get('requestTraceId') || 'trc_missing'
          }),
          413
        )
    })
  )

  auth.post('/login', async (c) => {
    const env = getServerEnv()
    const requestTraceId = c.get('requestTraceId') || 'trc_missing'

    const rawContentType = c.req.header('content-type') || ''
    const mediaType = rawContentType.split(';')[0]?.trim().toLowerCase()
    if (mediaType !== 'application/json') {
      return c.json(
        buildApiError({
          code: 'VALIDATION_FAILED',
          message: '登录请求必须使用 application/json 格式。',
          status: 415,
          requestTraceId
        }),
        415
      )
    }

    const ipKey = `ip:${getClientIp(c)}`
    if (!consumeRateLimit(ipKey, env.AUTH_LOGIN_RATE_LIMIT_MAX, env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS)) {
      return c.json(
        buildApiError({
          code: 'RATE_LIMITED',
          message: '登录尝试过于频繁，请稍后再试。',
          status: 429,
          requestTraceId
        }),
        429
      )
    }

    const rawBody = await c.req.json().catch(() => null)
    const parsed = LoginPayloadSchema.safeParse(rawBody)
    if (!parsed.success) {
      return c.json(
        buildApiError({
          code: 'VALIDATION_FAILED',
          message: '请提供有效的邮箱与密码（长度不超过 128 字符）。',
          status: 422,
          requestTraceId,
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            reason: issue.message
          }))
        }),
        422
      )
    }

    const normalizedEmail = parsed.data.email.toLowerCase()
    const emailKey = `email:${normalizedEmail}`
    if (!consumeRateLimit(emailKey, env.AUTH_LOGIN_RATE_LIMIT_MAX, env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS)) {
      return c.json(
        buildApiError({
          code: 'RATE_LIMITED',
          message: '该账号登录尝试过于频繁，请稍后再试。',
          status: 429,
          requestTraceId
        }),
        429
      )
    }

    const prisma = getPrisma()
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    const passwordValid = await verifyPasswordConstantTime(
      parsed.data.password,
      user?.passwordHash ?? null
    )

    if (!user || !user.isActive || !passwordValid) {
      return c.json(
        buildApiError({
          code: 'UNAUTHENTICATED',
          message: '邮箱或密码错误，或账号已停用。',
          status: 401,
          requestTraceId
        }),
        401
      )
    }

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = hashSessionToken(rawToken)
    const maxAgeSeconds = Math.max(60, Math.floor(env.SESSION_TTL_HOURS * 3600))
    const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000)

    await prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt
      }
    })

    const cookieOpts = buildSessionCookieOptions(env.NODE_ENV === 'production', maxAgeSeconds)
    setCookie(c, env.SESSION_COOKIE_NAME, rawToken, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge
    })

    return c.json(
      buildApiSuccess(
        {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role
        },
        requestTraceId,
        '登录成功'
      ),
      200
    )
  })

  auth.post('/logout', async (c) => {
    const env = getServerEnv()
    const requestTraceId = c.get('requestTraceId') || 'trc_missing'
    const rawToken = getCookie(c, env.SESSION_COOKIE_NAME)

    if (rawToken) {
      const tokenHash = hashSessionToken(rawToken)
      try {
        await getPrisma().session.updateMany({
          where: { tokenHash, revokedAt: null },
          data: { revokedAt: new Date() }
        })
      } catch (error) {
        logUnhandledError({
          error,
          route: 'POST /api/auth/logout',
          requestTraceId
        })
        return c.json(
          buildApiError({
            code: 'SERVICE_UNAVAILABLE',
            message: '会话吊销暂时失败，请稍后重试退出登录。',
            status: 503,
            requestTraceId
          }),
          503
        )
      }
    }

    deleteCookie(c, env.SESSION_COOKIE_NAME, { path: '/' })
    return c.json(buildApiSuccess({ loggedOut: true }, requestTraceId, '已退出登录'), 200)
  })

  auth.get('/me', async (c) => {
    const env = getServerEnv()
    const requestTraceId = c.get('requestTraceId') || 'trc_missing'
    const rawToken = getCookie(c, env.SESSION_COOKIE_NAME)
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

    return c.json(buildApiSuccess(resolved.actor, requestTraceId), 200)
  })

  return auth
}
