#!/usr/bin/env node
/**
 * 软件产品设计与全栈交付工作流 v1.4.0 — 生产迁移执行器（安全 URL 编码管理账号密码，先迁移后放行应用，STD-OPS-07）
 * 用法：
 *   node scripts/run-migrate.mjs --self-check
 *   node scripts/run-migrate.mjs
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function buildMigrationDatabaseUrl(env = process.env) {
  if (env.MIGRATION_DATABASE_URL) return env.MIGRATION_DATABASE_URL
  if (env.POSTGRES_USER && env.POSTGRES_PASSWORD && env.POSTGRES_DB) {
    const host = env.POSTGRES_HOST || 'postgres'
    const port = env.POSTGRES_PORT || '5432'
    const user = encodeURIComponent(env.POSTGRES_USER)
    const password = encodeURIComponent(env.POSTGRES_PASSWORD)
    const db = encodeURIComponent(env.POSTGRES_DB)
    return `postgresql://${user}:${password}@${host}:${port}/${db}?schema=public`
  }
  return env.DATABASE_URL
}

function runSelfCheck() {
  const encoded = buildMigrationDatabaseUrl({
    POSTGRES_USER: 'migrator',
    POSTGRES_PASSWORD: 'p@ss/w#rd?1=2&3',
    POSTGRES_HOST: 'postgres',
    POSTGRES_PORT: '5432',
    POSTGRES_DB: 'app_prod'
  })
  if (
    encoded !==
    'postgresql://migrator:p%40ss%2Fw%23rd%3F1%3D2%263@postgres:5432/app_prod?schema=public'
  ) {
    console.error('❌ run-migrate.mjs URL encoding self-check failed:', encoded)
    process.exit(1)
  }
  console.log('✅ run-migrate.mjs self-check passed (special-char percent-encoding verified).')
}

const entryArg = process.argv[1]
const isMain =
  entryArg !== undefined &&
  path.resolve(entryArg) === path.resolve(fileURLToPath(import.meta.url))

if (isMain) {
  const args = process.argv.slice(2)
  if (args.includes('--self-check')) {
    runSelfCheck()
  } else {
    const migrationUrl = buildMigrationDatabaseUrl(process.env)
    if (!migrationUrl) {
      console.error('❌ [run-migrate] 缺少 POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB 或 DATABASE_URL，已中止迁移！')
      process.exit(1)
    }
    const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx'
    console.log('🚀 [run-migrate] 正在应用启动前执行 Prisma 数据库迁移...')
    const res = spawnSync(npxBin, ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: migrationUrl }
    })
    process.exit(res.status ?? 1)
  }
}
