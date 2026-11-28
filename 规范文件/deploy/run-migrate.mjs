#!/usr/bin/env node
/**
 * 软件产品设计与全栈交付工作流 v1.4.1 — 生产迁移与运行权限同步执行器（安全 URL 编码、先迁移后授权、再放行应用，STD-OPS-07）
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

export function buildPrivilegeReconcileSql(appDbUser) {
  if (typeof appDbUser !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(appDbUser)) {
    return {
      ok: false,
      reason: 'APP_DB_USER 仅允许字母、数字与下划线，且不能以数字开头'
    }
  }
  const sql = [
    `GRANT USAGE ON SCHEMA public TO "${appDbUser}";`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${appDbUser}";`,
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${appDbUser}";`,
    `DO $$ BEGIN IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN EXECUTE 'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public."_prisma_migrations" FROM "${appDbUser}"'; END IF; END $$;`
  ].join('\n')
  return { ok: true, sql }
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
  const privOk = buildPrivilegeReconcileSql('app_runtime')
  const privBad = buildPrivilegeReconcileSql('bad"; DROP')
  if (!privOk.ok || !privOk.sql.includes('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public."_prisma_migrations"') || privBad.ok) {
    console.error('❌ run-migrate.mjs privilege reconcile SQL self-check failed:', { privOk, privBad })
    process.exit(1)
  }
  console.log('✅ run-migrate.mjs v1.4.1 self-check passed (special-char percent-encoding & privilege reconcile SQL verified).')
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
    if ((res.status ?? 1) !== 0) {
      process.exit(res.status ?? 1)
    }

    const appDbUser = (process.env.APP_DB_USER || '').trim()
    if (appDbUser) {
      const rec = buildPrivilegeReconcileSql(appDbUser)
      if (!rec.ok) {
        console.error(`❌ [run-migrate] 权限同步中止：${rec.reason}`)
        process.exit(1)
      }
      console.log(`🔒 [run-migrate] 正在为最小权限账号 "${appDbUser}" 幂等同步表/序列权限并锁定迁移历史表...`)
      const execRes = spawnSync(
        npxBin,
        ['prisma', 'db', 'execute', '--stdin', '--schema', 'prisma/schema.prisma'],
        {
          input: rec.sql,
          stdio: ['pipe', 'inherit', 'inherit'],
          env: { ...process.env, DATABASE_URL: migrationUrl }
        }
      )
      if ((execRes.status ?? 1) !== 0) {
        process.exit(execRes.status ?? 1)
      }
    }
    process.exit(0)
  }
}
