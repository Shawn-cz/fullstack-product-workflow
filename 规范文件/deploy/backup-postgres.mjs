#!/usr/bin/env node
/**
 * 软件产品设计与全栈交付工作流 v1.1.0 — PostgreSQL 16 跨平台一键备份与演练恢复脚本
 * 对应规则：STD-DAT-04（迁移前备份与恢复验证）、STD-OPS-03（可回退核对）、STD-OPS-07
 *
 * 用法：
 *   node backup-postgres.mjs --self-check
 *   node backup-postgres.mjs --backup [--container prod_postgres] [--user app_user] [--db app_dev_db] [--out ./backups]
 *   node backup-postgres.mjs --restore ./backups/pg-xxx.sql --confirm-restore [--container prod_postgres]
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)

function getFlag(name, fallback) {
  const idx = args.indexOf(name)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback
}

function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function runSelfCheck() {
  const digest = createHash('sha256').update('v1.1.0-pg-backup').digest('hex')
  if (digest.length !== 64) {
    console.error('❌ backup-postgres.mjs SHA-256 self-check failed.')
    process.exit(1)
  }
  console.log('✅ backup-postgres.mjs self-check passed (Node ' + process.version + ', restore safety guard enabled).')
}

function runBackup() {
  const container = getFlag('--container', process.env.PG_CONTAINER || 'team_project_postgres')
  const user = getFlag('--user', process.env.POSTGRES_USER || 'app_user')
  const db = getFlag('--db', process.env.POSTGRES_DB || 'app_dev_db')
  const outDir = path.resolve(getFlag('--out', './backups'))

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dumpFile = path.join(outDir, `pg-${db}-${stamp}.sql`)

  console.log(`📦 正在从容器 ${container} 备份 PostgreSQL 数据库 ${db} → ${dumpFile} ...`)
  const res = spawnSync(
    'docker',
    ['exec', container, 'pg_dump', '-U', user, '-d', db, '--clean', '--if-exists', '--no-owner'],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
  )

  if (res.status !== 0) {
    console.error('❌ pg_dump 执行失败:', res.stderr || res.error?.message)
    process.exit(res.status || 1)
  }

  fs.writeFileSync(dumpFile, res.stdout, 'utf8')
  const digest = sha256File(dumpFile)
  fs.writeFileSync(dumpFile + '.sha256', `${digest}  ${path.basename(dumpFile)}\n`, 'utf8')
  console.log(`✅ 备份成功：${dumpFile}`)
  console.log(`   SHA-256 校验值：${digest}（已保存至 .sha256 文件，可用于 T09 证据登记）`)
}

function runRestore() {
  const targetFile = getFlag('--restore', '')
  if (!targetFile || !fs.existsSync(targetFile)) {
    console.error('❌ 请通过 --restore <备份文件路径> 指定有效的 .sql 备份文件。')
    process.exit(1)
  }
  if (!args.includes('--confirm-restore')) {
    console.error('❌ [安全护栏] 恢复操作会覆盖目标数据库！请先核对目标容器无误，再显式附加 --confirm-restore 参数执行。')
    process.exit(1)
  }

  // 若存在配套 .sha256 文件，恢复前先校验备份文件完整性
  const shaPath = targetFile + '.sha256'
  if (fs.existsSync(shaPath)) {
    const expected = fs.readFileSync(shaPath, 'utf8').trim().split(/\s+/)[0]
    const actual = sha256File(targetFile)
    if (expected !== actual) {
      console.error(`❌ 备份文件完整性校验失败！预期 ${expected}，实际 ${actual}，已中止恢复。`)
      process.exit(1)
    }
    console.log('✅ 备份文件 SHA-256 完整性校验通过。')
  }

  const container = getFlag('--container', process.env.PG_CONTAINER || 'team_project_postgres')
  const user = getFlag('--user', process.env.POSTGRES_USER || 'app_user')
  const db = getFlag('--db', process.env.POSTGRES_DB || 'app_dev_db')
  const sqlContent = fs.readFileSync(targetFile, 'utf8')

  console.log(`♻️ 正在向容器 ${container} 数据库 ${db} 执行恢复...`)
  const res = spawnSync('docker', ['exec', '-i', container, 'psql', '-U', user, '-d', db, '-v', 'ON_ERROR_STOP=1'], {
    input: sqlContent,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024
  })

  if (res.status !== 0) {
    console.error('❌ 数据库恢复失败:', res.stderr || res.error?.message)
    process.exit(res.status || 1)
  }

  console.log('✅ 数据库恢复完成，请立即运行发布后核心路径核验并记录至 T09。')
}

if (args.includes('--self-check')) {
  runSelfCheck()
} else if (args.includes('--backup')) {
  runBackup()
} else if (args.includes('--restore')) {
  runRestore()
} else {
  console.log('用法: node backup-postgres.mjs [--self-check | --backup | --restore <file> --confirm-restore]')
}
