#!/usr/bin/env node
// @desc 安全数据库重置与 E2E 隔离执行守卫（先核验非生产/本地主机/目标库名，再执行 reset/seed/Playwright，STD-QA-14）
/**
 * 软件产品设计与全栈交付工作流 v1.4.1 — 数据库安全重置与独立 E2E 闭环执行器
 * 用法：
 *   node scripts/safe-db-reset.mjs --self-check
 *   node scripts/safe-db-reset.mjs                 # 重置开发环境数据库（读取 DATABASE_URL）
 *   node scripts/safe-db-reset.mjs --test          # 仅重置独立测试数据库（强制读取与开发库不同的 TEST_DATABASE_URL）
 *   node scripts/safe-db-reset.mjs --test --run-e2e # 先核验 tests/e2e 用例与双库隔离，再同链执行 reset/seed/Playwright
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

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
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
      reason: `目标主机 "${host}" 非本地地址（仅允许 localhost/127.0.0.1/::1/postgres；如确需重置请显式加 --allow-non-local）。`
    }
  }
  if (!allowAnyName && !/(?:^|[_-])(?:dev|test|local)(?:$|[_-])/i.test(dbName)) {
    return {
      ok: false,
      reason: `目标数据库名 "${dbName}" 未包含独立的 dev/test/local 词边界标识（如确需重置请显式加 --allow-any-name）。`
    }
  }

  return { ok: true, host, dbName }
}

export function validateTestIsolation({ databaseUrl, testDatabaseUrl }) {
  if (!testDatabaseUrl) {
    return {
      ok: false,
      reason: 'TEST_DATABASE_URL 未配置！`npm run test:e2e:fresh` 必须指向独立测试库，严禁回退清空日常开发库。'
    }
  }
  let parsedTest
  try {
    parsedTest = new URL(testDatabaseUrl)
  } catch {
    return { ok: false, reason: 'TEST_DATABASE_URL 格式无效。' }
  }
  const testHost = parsedTest.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  const testPort = parsedTest.port || '5432'
  const testDbName = parsedTest.pathname.replace(/^\/+/, '').split('/')[0] || ''
  if (!testDbName) {
    return { ok: false, reason: 'TEST_DATABASE_URL 缺少数据库名称。' }
  }
  if (databaseUrl) {
    try {
      const parsedDev = new URL(databaseUrl)
      const devHost = parsedDev.hostname.toLowerCase().replace(/^\[|\]$/g, '')
      const devPort = parsedDev.port || '5432'
      const devDbName = parsedDev.pathname.replace(/^\/+/, '').split('/')[0] || ''
      if (testHost === devHost && testPort === devPort && testDbName === devDbName) {
        return {
          ok: false,
          reason: `TEST_DATABASE_URL 与 DATABASE_URL 指向同一数据库 (${testHost}:${testPort}/${testDbName})，禁止共用开发库执行 E2E 清库！`
        }
      }
    } catch {
      // 主连接串不可解析时，交由后续目标校验处理
    }
  }
  return { ok: true, host: testHost, dbName: testDbName }
}

function hasE2eSpecs(rootDir = process.cwd()) {
  const e2eDir = path.join(rootDir, 'tests', 'e2e')
  if (!fs.existsSync(e2eDir)) return false
  const stack = [e2eDir]
  while (stack.length > 0) {
    const cur = stack.pop()
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, ent.name)
      if (ent.isDirectory()) {
        stack.push(full)
      } else if (/\.spec\.tsx?$/.test(ent.name)) {
        return true
      }
    }
  }
  return false
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
  const rContest = validateResetTarget({
    nodeEnv: 'development',
    databaseUrl: 'postgresql://u:p@127.0.0.1:5432/contest'
  })
  const rIpv6 = validateResetTarget({
    nodeEnv: 'test',
    databaseUrl: 'postgresql://u:p@[::1]:5432/app_test_db'
  })
  const rIsoMissing = validateTestIsolation({
    databaseUrl: 'postgresql://u:p@127.0.0.1:5432/app_dev_db',
    testDatabaseUrl: ''
  })
  const rIsoSame = validateTestIsolation({
    databaseUrl: 'postgresql://u:p@127.0.0.1:5432/app_dev_db',
    testDatabaseUrl: 'postgresql://u:p@127.0.0.1:5432/app_dev_db'
  })
  const rIsoOk = validateTestIsolation({
    databaseUrl: 'postgresql://u:p@127.0.0.1:5432/app_dev_db',
    testDatabaseUrl: 'postgresql://u:p@127.0.0.1:5432/app_test_db'
  })
  if (
    rProd.ok ||
    rRemote.ok ||
    rProdName.ok ||
    rContest.ok ||
    !rIpv6.ok ||
    rIsoMissing.ok ||
    rIsoSame.ok ||
    !rIsoOk.ok
  ) {
    console.error('❌ safe-db-reset.mjs self-check failed:', {
      rProd,
      rRemote,
      rProdName,
      rContest,
      rIpv6,
      rIsoMissing,
      rIsoSame,
      rIsoOk
    })
    process.exit(1)
  }
  console.log('✅ safe-db-reset.mjs v1.4.1 self-check passed (word-boundary / IPv6 / dual-DB isolation verified).')
}

function runReset(args) {
  const runE2e = args.includes('--run-e2e')
  if (runE2e && !hasE2eSpecs(process.cwd())) {
    console.log('ℹ️ [E2E Fresh] tests/e2e/ 下尚无 .spec.ts(x) 用例（S0 初始底座；进入 S6 添加用例后再执行），已安全跳过清库与 Playwright。')
    process.exit(0)
  }

  loadDotEnvMissing()
  const useTestDb = args.includes('--test')
  let databaseUrl = process.env.DATABASE_URL
  if (useTestDb) {
    const iso = validateTestIsolation({
      databaseUrl: process.env.DATABASE_URL,
      testDatabaseUrl: process.env.TEST_DATABASE_URL
    })
    if (!iso.ok) {
      console.error(`❌ [Safe Reset Guard] ${iso.reason}`)
      process.exit(1)
    }
    databaseUrl = process.env.TEST_DATABASE_URL
  }

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

  if (runE2e) {
    const e2eApiPort = process.env.E2E_PORT || '3101'
    const e2eWebPort = process.env.E2E_FRONTEND_PORT || '5273'
    console.log(`🎭 [E2E Fresh] 启动隔离测试服务 (API=${e2eApiPort}, Web=${e2eWebPort}, DB=${verdict.dbName}) 并运行 Playwright...`)
    const pwRes = spawnSync(npxBin, ['playwright', 'test'], {
      stdio: 'inherit',
      env: {
        ...envWithTarget,
        PORT: e2eApiPort,
        FRONTEND_PORT: e2eWebPort,
        E2E_FORCE_FRESH_SERVER: '1'
      }
    })
    process.exit(pwRes.status ?? 1)
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
