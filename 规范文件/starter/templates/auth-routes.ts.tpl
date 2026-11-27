// @desc 服务端标准认证路由（/api/auth/login、/logout、/me；HttpOnly Cookie + PostgreSQL 可吊销会话，STD-SEC-05）
/**
 * 软件产品设计与全栈交付工作流 v1.3.1 — 与 Playwright auth-contexts.ts 开箱对齐的认证路由骨架
 * 对应规则：STD-SEC-05、STD-QA-12
 *
 * 预置接口：
 *   - POST /api/auth/login   校验邮箱与 scrypt 密码，写入 PostgreSQL Session 并下发 HttpOnly Cookie
 *   - POST /api/auth/logout  立即设置 Session.revokedAt 吊销服务端会话并清除 Cookie
 *   - GET  /api/auth/me      校验会话有效性，有效返回 AuthenticatedActor，否则返回 401
 */
import { randomBytes } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { z } from 'zod'
import {
  buildSessionCookieOptions,
  hashSessionToken,
  resolveAuthenticatedActor,
  verifyPassword
} from '../middleware/auth-rbac'

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'app_sid'
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 168)

const LoginPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export function createAuthRoutes(getPrisma: () => PrismaClient) {
  const auth = new Hono()

  auth.post('/login', async (c) => {
    const rawBody = await c.req.json().catch(() => null)
    const parsed = LoginPayloadSchema.safeParse(rawBody)
    if (!parsed.success) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请提供有效的邮箱与密码。'
          }
        },
        400
      )
    }

    const prisma = getPrisma()
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email }
    })

    if (!user || !user.isActive || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: '邮箱或密码错误，或账号已停用。'
          }
        },
        401
      )
    }

    const rawToken = randomBytes(32).toString('hex')
    const tokenHash = hashSessionToken(rawToken)
    const maxAgeSeconds = Math.max(60, Math.floor(SESSION_TTL_HOURS * 3600))
    const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000)

    await prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt
      }
    })

    const cookieOpts = buildSessionCookieOptions(process.env.NODE_ENV === 'production', maxAgeSeconds)
    setCookie(c, SESSION_COOKIE_NAME, rawToken, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge
    })

    return c.json(
      {
        ok: true,
        data: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role
        }
      },
      200
    )
  })

  auth.post('/logout', async (c) => {
    const rawToken = getCookie(c, SESSION_COOKIE_NAME)
    if (rawToken) {
      const tokenHash = hashSessionToken(rawToken)
      await getPrisma()
        .session.updateMany({
          where: { tokenHash, revokedAt: null },
          data: { revokedAt: new Date() }
        })
        .catch(() => null)
    }

    deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' })
    return c.json({ ok: true, data: { loggedOut: true } }, 200)
  })

  auth.get('/me', async (c) => {
    const rawToken = getCookie(c, SESSION_COOKIE_NAME)
    if (!rawToken) {
      return c.json(
        {
          ok: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: '登录状态已失效或未登录，请重新登录。'
          }
        },
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
      return c.json({ ok: false, error: resolved.error }, resolved.error.status)
    }

    return c.json({ ok: true, data: resolved.actor }, 200)
  })

  return auth
}
