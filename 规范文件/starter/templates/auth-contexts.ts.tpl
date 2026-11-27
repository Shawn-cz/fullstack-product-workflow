// @desc Playwright 多角色隔离上下文 Fixture（程序化双无痕窗口，STD-SEC-05 / STD-QA-12）
import { test as base, expect, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { TEST_ACCOUNT_MAP, type TestAccountRole } from '../../../prisma/test-accounts'

const LOGIN_ENDPOINT = process.env.E2E_LOGIN_PATH || '/api/auth/login'
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'app_sid'

export interface RoleSession {
  context: BrowserContext
  page: Page
  role: TestAccountRole
  email: string
}

async function createLoggedInSession(
  browser: Browser,
  role: TestAccountRole,
  baseURL?: string
): Promise<RoleSession> {
  // 每个角色使用独立 BrowserContext（等价全新无痕窗口，Cookie 与 Storage 完全隔离）
  const context = await browser.newContext({ baseURL })
  const acc = TEST_ACCOUNT_MAP[role]

  const res = await context.request.post(LOGIN_ENDPOINT, {
    data: { email: acc.email, password: acc.password }
  })
  expect(res.ok(), `[${role}] 登录失败 (${LOGIN_ENDPOINT}): HTTP ${res.status()}`).toBeTruthy()

  const page = await context.newPage()
  return { context, page, role, email: acc.email }
}

/**
 * 验证会话 Cookie 必须为 HttpOnly，且严禁在 localStorage 或 document.cookie 中泄露凭据 (STD-SEC-05)
 */
export async function assertHttpOnlySessionAndCleanStorage(
  session: RoleSession,
  pathToVisit: string = '/'
): Promise<void> {
  await session.page.goto(pathToVisit)
  const cookies = await session.context.cookies()
  const sessionCookie = cookies.find(
    (c) => c.name === SESSION_COOKIE_NAME || /sid|session/i.test(c.name)
  )
  expect(sessionCookie, `[${session.role}] 未检测到服务端会话 Cookie`).toBeDefined()
  expect(sessionCookie?.httpOnly, `[${session.role}] 会话 Cookie 必须设置 HttpOnly`).toBe(true)

  const storageDump = await session.page.evaluate(() => ({
    localStorageKeys: Object.keys(window.localStorage),
    docCookie: document.cookie
  }))
  expect(
    storageDump.localStorageKeys.join(','),
    `[${session.role}] localStorage 不得存储认证凭据`
  ).not.toMatch(/token|session|auth|jwt/i)
  expect(
    storageDump.docCookie,
    `[${session.role}] document.cookie 不得读取到 HttpOnly 会话 Cookie`
  ).not.toContain(SESSION_COOKIE_NAME)
}

export const test = base.extend<{
  anonContext: BrowserContext
  memberA: RoleSession
  memberB: RoleSession
  handler: RoleSession
  admin: RoleSession
}>({
  anonContext: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL })
    await use(context)
    await context.close()
  },
  memberA: async ({ browser, baseURL }, use) => {
    const session = await createLoggedInSession(browser, 'MEMBER_A', baseURL)
    await use(session)
    await session.context.close()
  },
  memberB: async ({ browser, baseURL }, use) => {
    const session = await createLoggedInSession(browser, 'MEMBER_B', baseURL)
    await use(session)
    await session.context.close()
  },
  handler: async ({ browser, baseURL }, use) => {
    const session = await createLoggedInSession(browser, 'HANDLER', baseURL)
    await use(session)
    await session.context.close()
  },
  admin: async ({ browser, baseURL }, use) => {
    const session = await createLoggedInSession(browser, 'ADMIN', baseURL)
    await use(session)
    await session.context.close()
  }
})

export { expect }
