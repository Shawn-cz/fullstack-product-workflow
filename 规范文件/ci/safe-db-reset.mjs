#!/usr/bin/env node
// @desc 安全数据库重置守卫（先核验非生产/本地主机/目标库名，再执行 prisma migrate reset 与 seed，STD-QA-14）
/**
 * 对应规则：STD-QA-14（测试种子与安全重置）、STD-DAT-04
 * 用法：
 *   node scripts/safe-db-reset.mjs --self-check
 *   node scripts/safe-db-reset.mjs            # 重置开发环境数据库（读取 DATABASE_URL）
 *   node scripts/safe-db-reset.mjs --test     # 重置测试数据库（优先读取 TEST_DATABASE_URL，否则回退 DATABASE_URL）
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres'])

function loadDotEnvMissing(cwd = process.cwd()) {
  if (process.env.NODE_ENV === 'production') return
  const envPath = path.join(cwd, '.env')
  if (!fs.existsSync(envPath)) return
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx <= 0) continue
    const key = line.slice(0, eqIdx).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue
    let val = line.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

export function validateResetTarget({
  nodeEnv = process.env.NODE_ENV || 'development',
  databaseUrl,
  allowNonLocal = false,
  allowAnyName = false
}) {
  if (nodeEnv === 'production') {
    return { ok: false, reason: '检测到 NODE_ENV=production，严禁清库！' }
  }
  if (!databaseUrl) {
    return { ok: false, reason: '未配置目标数据库连接串 (DATABASE_URL / TEST_DATABASE_URL)。' }
  }

  let parsed
  try {
    parsed = new URL(databaseUrl)
  } catch {
    return { ok: false, reason: '目标数据库连接串格式无效，无法解析主机与库名。' }
  }

  const host = parsed.hostname.toLowerCase()
  const dbName = parsed.pathname.replace(/^\/+/, '').split('/')[0] || ''
  if (!dbName) {
    return { ok: false, reason: '连接串缺少数据库名称。' }
  }
  if (/prod|production/i.test(dbName)) {
    return { ok: false, reason: `目标数据库名 "${dbName}" 包含 prod/production，已强制拦截清库！` }
  }
  if (!allowNonLocal && !LOCAL_HOSTS.has(host)) {
    return {
      ok: false,
      reason: `目标主机 "${host}" 非本地地址（仅允许 localhost/127.0.0.1/postgres；如确需重置请显式加 --allow-non-local）。`
    }
  }
  if (!allowAnyName && !/(?:^|_|-)(?:dev|test|local)(?:$|_|-)/i.test(dbName) && !/(dev|test|local)/i.test(dbName)) {
    return {
      ok: false,
      reason: `目标数据库名 "${dbName}" 未包含 dev/test/local 标识（如确需重置请显式加 --allow-any-name）。`
    }
  }

  return { ok: true, host, dbName }
}

function runSelfCheck() {
  const rProd = validateResetTarget({
    nodeEnv: 'production',
    databaseUrl: 'postgresql://u:p@127.0.0.1:5432/app_dev_db'
  })
  const rRemote = validateResetTarget({
    nodeEnv: 'development',
    databaseUrl: 'postgresql://u:p@db.example.com:5432/app_dev_db'
  })
  const rProdName = validateResetTarget({
    nodeEnv: 'development',
    databaseUrl: 'postgresql://u:p@127.0.0.1:5432/app_prod_db'
  })
  const rOk = validateResetTarget({
    nodeEnv: 'test',
    databaseUrl: 'postgresql://u:p@127.0.0.1:5432/app_test_db'
  })
  if (rProd.ok || rRemote.ok || rProdName.ok || !rOk.ok) {
    console.error('❌ safe-db-reset.mjs self-check failed:', { rProd, rRemote, rProdName, rOk })
    process.exit(1)
  }
  console.log('✅ safe-db-reset.mjs self-check passed (production / remote / prod-db guards verified).')
}

function runReset(args) {
  loadDotEnvMissing()
  const useTestDb = args.includes('--test')
  const databaseUrl = useTestDb
    ? process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    : process.env.DATABASE_URL

  const verdict = validateResetTarget({
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl,
    allowNonLocal: args.includes('--allow-non-local'),
    allowAnyName: args.includes('--allow-any-name')
  })

  if (!verdict.ok) {
    console.error(`❌ [Safe Reset Guard] ${verdict.reason}`)
    process.exit(1)
  }

  console.log(`🛡️ [Safe Reset Guard] 目标已核验：host=${verdict.host}, db=${verdict.dbName}，开始执行清库与种子写入...`)
  const envWithTarget = { ...process.env, DATABASE_URL: databaseUrl }
  const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm'

  const resetRes = spawnSync(npxBin, ['prisma', 'migrate', 'reset', '--force'], {
    stdio: 'inherit',
    env: envWithTarget
  })
  if (resetRes.status !== 0) {
    process.exit(resetRes.status || 1)
  }

  const seedRes = spawnSync(npmBin, ['run', 'db:seed'], {
    stdio: 'inherit',
    env: envWithTarget
  })
  if (seedRes.status !== 0) {
    process.exit(seedRes.status || 1)
  }
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
    runReset(args)
  }
}
