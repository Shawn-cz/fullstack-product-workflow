// @desc 服务端环境变量统一加载、Zod 校验与安全数据库 URL 组装 (STD-SEC-03 / STD-OPS-01)
/**
 * 软件产品设计与全栈交付工作流 v1.4.1 — 服务端配置加载与校验底座
 * 说明：
 * 1. 非生产环境下自动读取根目录 `.env`（仅填充未在进程环境设置的键值，不覆盖 CI/测试显式传参）；
 * 2. 使用 Zod 严格校验端口、Cookie 名称、会话有效期、限流阈值与数据库连接字段；
 * 3. 对用户名与密码进行 percent-encoding，防止高熵密码含 `/`、`#`、`@` 时破坏 PostgreSQL URL。
 */
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'

let dotEnvLoaded = false

export function loadDotEnvIfNeeded(cwd: string = process.cwd()): void {
  if (dotEnvLoaded || process.env.NODE_ENV === 'production') return
  dotEnvLoaded = true
  const envPath = path.join(cwd, '.env')
  if (!fs.existsSync(envPath)) return
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx <= 0) continue
    const key = line.slice(0, eqIdx).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    if (process.env[key] !== undefined) continue
    let val = line.slice(eqIdx + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

export const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  FRONTEND_PORT: z.coerce.number().int().min(1).max(65535).default(5173),
  SERVICE_NAME: z.string().min(1).default('team-fullstack-api'),
  APP_VERSION: z.string().min(1).default('0.1.0'),
  APP_DOMAIN: z.string().trim().min(1).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  SESSION_COOKIE_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_-]{2,64}$/)
    .default('app_sid'),
  SESSION_TTL_HOURS: z.coerce.number().finite().min(1).max(24 * 365).default(168),
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(10),
  AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(3_600_000).default(60_000),
  DATABASE_URL: z.string().min(1).optional(),
  POSTGRES_HOST: z.string().min(1).default('127.0.0.1'),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  POSTGRES_DB: z.string().min(1).optional(),
  APP_DB_USER: z.string().min(1).optional(),
  APP_DB_PASSWORD: z.string().min(1).optional()
})

export type ServerEnv = z.infer<typeof ServerEnvSchema>

export function buildEncodedPostgresUrl(params: {
  host: string
  port: number
  user: string
  password: string
  db: string
  schema?: string
}): string {
  const user = encodeURIComponent(params.user)
  const password = encodeURIComponent(params.password)
  const db = encodeURIComponent(params.db)
  const schema = encodeURIComponent(params.schema || 'public')
  return `postgresql://${user}:${password}@${params.host}:${params.port}/${db}?schema=${schema}`
}

export function resolveDatabaseUrl(env: ServerEnv): string | undefined {
  if (env.APP_DB_USER && env.APP_DB_PASSWORD && env.POSTGRES_DB) {
    return buildEncodedPostgresUrl({
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      user: env.APP_DB_USER,
      password: env.APP_DB_PASSWORD,
      db: env.POSTGRES_DB
    })
  }
  return env.DATABASE_URL
}

export function resolveAllowedOrigins(env: ServerEnv): string[] {
  const origins = new Set<string>()
  if (env.NODE_ENV !== 'production') {
    origins.add(`http://127.0.0.1:${env.FRONTEND_PORT}`)
    origins.add(`http://localhost:${env.FRONTEND_PORT}`)
    origins.add(`http://127.0.0.1:${env.PORT}`)
    origins.add(`http://localhost:${env.PORT}`)
  }
  if (env.APP_DOMAIN) {
    origins.add(`https://${env.APP_DOMAIN}`)
  }
  if (env.ALLOWED_ORIGINS) {
    for (const item of env.ALLOWED_ORIGINS.split(',')) {
      const trimmed = item.trim()
      if (trimmed) origins.add(trimmed)
    }
  }
  return [...origins]
}

let cachedEnv: ServerEnv | null = null

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv
  loadDotEnvIfNeeded()
  const raw: Record<string, string | undefined> = { ...process.env }
  // 将空字符串可选变量归一为 undefined，防止 Zod min(1) 或 optional 误失败
  for (const key of ['APP_DOMAIN', 'ALLOWED_ORIGINS', 'DATABASE_URL', 'POSTGRES_DB', 'APP_DB_USER', 'APP_DB_PASSWORD']) {
    if (raw[key] === '') raw[key] = undefined
  }
  const parsed = ServerEnvSchema.safeParse(raw)
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`[ServerEnv] 环境变量配置校验失败: ${details}`)
  }
  cachedEnv = parsed.data
  return cachedEnv
}
