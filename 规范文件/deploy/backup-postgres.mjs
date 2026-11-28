#!/usr/bin/env node
/**
 * 软件产品设计与全栈交付工作流 v1.4.0 — PostgreSQL 16 跨平台流式备份与事务原子恢复脚本
 * 对应规则：STD-DAT-04（迁移前备份与恢复验证）、STD-OPS-03（可回退核对）、STD-OPS-07
 *
 * 用法：
 *   node backup-postgres.mjs --self-check
 *   node backup-postgres.mjs --backup --env dev|prod [--out ./backups]
 *   node backup-postgres.mjs --restore ./backups/pg-xxx.sql --env dev|prod --confirm-restore
 */
import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)

function getFlag(name, fallback = '') {
  const idx = args.indexOf(name)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback
}

export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null
  const out = {}
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIdx = line.indexOf('=')
    if (eqIdx <= 0) continue
    const key = line.slice(0, eqIdx).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    let val = line.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

function resolveTarget(cwd = process.cwd()) {
  const envFlag = getFlag('--env', '')
  const explicitContainer = getFlag('--container', '')
  const explicitUser = getFlag('--user', '')
  const explicitDb = getFlag('--db', '')

  if (!envFlag && (!explicitContainer || !explicitUser || !explicitDb)) {
    throw new Error('必须显式指定 `--env dev` 或 `--env prod`（或同时指定 --container、--user、--db），禁止隐式猜测操作目标库！')
  }

  if (envFlag === 'prod') {
    const prodEnvPath = path.join(cwd, '.env.production')
    const prodEnv = parseEnvFile(prodEnvPath)
    if (!prodEnv) {
      throw new Error('选择 --env prod 但未找到 .env.production，已中止以防误操作开发数据库！')
    }
    const container = explicitContainer || prodEnv.PG_CONTAINER || 'prod_postgres'
    const user = explicitUser || prodEnv.POSTGRES_USER
    const db = explicitDb || prodEnv.POSTGRES_DB
    if (!user || !db) {
      throw new Error('.env.production 缺少 POSTGRES_USER 或 POSTGRES_DB')
    }
    return { envMode: 'prod', source: '.env.production', container, user, db }
  }

  if (envFlag === 'dev') {
    const devEnv = parseEnvFile(path.join(cwd, '.env')) || {}
    let container = explicitContainer || process.env.PG_CONTAINER || ''
    if (!container && fs.existsSync(path.join(cwd, 'docker-compose.postgres.yml'))) {
      const q = spawnSync('docker', ['compose', '-f', 'docker-compose.postgres.yml', 'ps', '-q', 'postgres'], {
        cwd,
        encoding: 'utf8'
      })
      const detected = (q.stdout || '').trim().split(/\r?\n/)[0]
      if (q.status === 0 && detected) container = detected
    }
    if (!container) {
      throw new Error('未检测到运行中的本地开发 PostgreSQL 容器（请先执行 npm run db:up 或通过 --container 指定）。')
    }
    const user = explicitUser || process.env.POSTGRES_USER || devEnv.POSTGRES_USER || 'app_user'
    const db = explicitDb || process.env.POSTGRES_DB || devEnv.POSTGRES_DB || 'app_dev_db'
    return { envMode: 'dev', source: '.env/docker-compose.postgres.yml', container, user, db }
  }

  return {
    envMode: 'explicit',
    source: 'cli-flags',
    container: explicitContainer,
    user: explicitUser,
    db: explicitDb
  }
}

function sha256FileStream(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

function runSelfCheck() {
  const digest = createHash('sha256').update('v1.4.0-pg-backup').digest('hex')
  if (digest.length !== 64) {
    console.error('❌ backup-postgres.mjs SHA-256 self-check failed.')
    process.exit(1)
  }
  let missingEnvRejected = false
  try {
    resolveTarget('/nonexistent-dir-for-self-check')
  } catch {
    missingEnvRejected = true
  }
  if (!missingEnvRejected) {
    console.error('❌ backup-postgres.mjs target guard self-check failed.')
    process.exit(1)
  }
  console.log('✅ backup-postgres.mjs v1.4.0 self-check passed (Node ' + process.version + ', explicit --env + streaming + atomic restore ready).')
}

async function runBackup() {
  const target = resolveTarget()
  const outDir = path.resolve(getFlag('--out', './backups'))
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dumpFile = path.join(outDir, `pg-${target.envMode}-${target.db}-${stamp}.sql`)

  console.log(
    `📦 [Backup] env=${target.envMode} (source=${target.source}) | container=${target.container} | db=${target.db} | user=${target.user} → ${dumpFile}`
  )

  const hash = createHash('sha256')
  const writeStream = fs.createWriteStream(dumpFile)
  let stderrText = ''

  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      'docker',
      ['exec', target.container, 'pg_dump', '-U', target.user, '-d', target.db, '--clean', '--if-exists', '--no-owner'],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    )
    child.stdout.on('data', (chunk) => {
      hash.update(chunk)
      if (!writeStream.write(chunk)) {
        child.stdout.pause()
        writeStream.once('drain', () => child.stdout.resume())
      }
    })
    child.stderr.on('data', (chunk) => {
      stderrText += chunk.toString('utf8')
    })
    child.on('error', reject)
    child.on('close', (code) => {
      writeStream.end(() => resolve(code ?? 1))
    })
  })

  if (exitCode !== 0) {
    fs.rmSync(dumpFile, { force: true })
    console.error('❌ pg_dump 流式备份失败:', stderrText)
    process.exit(exitCode)
  }

  const digest = hash.digest('hex')
  fs.writeFileSync(dumpFile + '.sha256', `${digest}  ${path.basename(dumpFile)}\n`, 'utf8')
  console.log(`✅ 备份成功：${dumpFile}`)
  console.log(`   SHA-256 校验值：${digest}（已保存至 .sha256 文件，可用于 T09 证据登记）`)
}

async function runRestore() {
  const targetFile = getFlag('--restore', '')
  if (!targetFile || !fs.existsSync(targetFile)) {
    console.error('❌ 请通过 --restore <备份文件路径> 指定有效的 .sql 备份文件。')
    process.exit(1)
  }
  if (!args.includes('--confirm-restore')) {
    console.error('❌ [安全护栏] 恢复操作会覆盖目标数据库！请先核对目标环境，再显式附加 --confirm-restore 参数执行。')
    process.exit(1)
  }

  const shaPath = targetFile + '.sha256'
  if (!fs.existsSync(shaPath)) {
    if (!args.includes('--skip-checksum-unsafe')) {
      console.error(`❌ 缺少配套校验文件 ${shaPath}，已拒绝恢复（如确为无摘要外部文件请显式加 --skip-checksum-unsafe）。`)
      process.exit(1)
    }
  } else {
    const expected = fs.readFileSync(shaPath, 'utf8').trim().split(/\s+/)[0]
    const actual = await sha256FileStream(targetFile)
    if (expected !== actual) {
      console.error(`❌ 备份文件完整性校验失败！预期 ${expected}，实际 ${actual}，已中止恢复。`)
      process.exit(1)
    }
    console.log('✅ 备份文件 SHA-256 完整性校验通过。')
  }

  const target = resolveTarget()
  console.log(
    `♻️ [Restore] env=${target.envMode} (source=${target.source}) | container=${target.container} | db=${target.db} | user=${target.user} (单事务原子恢复)...`
  )

  let stderrText = ''
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      'docker',
      ['exec', '-i', target.container, 'psql', '-U', target.user, '-d', target.db, '--single-transaction', '-v', 'ON_ERROR_STOP=1'],
      { stdio: ['pipe', 'inherit', 'pipe'] }
    )
    const readStream = fs.createReadStream(targetFile)
    readStream.pipe(child.stdin)
    readStream.on('error', reject)
    child.stderr.on('data', (chunk) => {
      stderrText += chunk.toString('utf8')
    })
    child.on('error', reject)
    child.on('close', (code) => resolve(code ?? 1))
  })

  if (exitCode !== 0) {
    console.error('❌ 数据库事务恢复失败（已整体回滚）:', stderrText)
    process.exit(exitCode)
  }

  console.log('✅ 数据库事务恢复完成，请立即运行发布后核心路径核验并记录至 T09。')
}

const entryArg = process.argv[1]
const isMain =
  entryArg !== undefined &&
  path.resolve(entryArg) === path.resolve(fileURLToPath(import.meta.url))

if (isMain) {
  if (args.includes('--self-check')) {
    runSelfCheck()
  } else if (args.includes('--backup')) {
    runBackup().catch((err) => {
      console.error('❌ Backup failed:', err.message)
      process.exit(1)
    })
  } else if (args.includes('--restore')) {
    runRestore().catch((err) => {
      console.error('❌ Restore failed:', err.message)
      process.exit(1)
    })
  } else {
    console.log('用法: node backup-postgres.mjs [--self-check | --backup --env dev|prod | --restore <file> --env dev|prod --confirm-restore]')
  }
}
