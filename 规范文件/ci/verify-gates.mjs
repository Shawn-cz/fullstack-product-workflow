#!/usr/bin/env node
/**
 * 软件产品设计与全栈交付工作流 v0.9.0 — CI 四道硬门禁 & 指纹校验脚本
 * 对应规则：STD-QA-13（四道硬门禁）、STD-AUD-07（三重指纹）、STD-GOV-03（闭环追溯）
 *
 * 用法：
 *   node verify-gates.mjs --self-check   # 校验工作流内脚本自检
 *   node verify-gates.mjs --gate=1       # 门禁 1：REQ↔AC↔TEST 闭环追溯检查
 *   node verify-gates.mjs --gate=2       # 门禁 2：防测试作弊与代码坏味道扫描
 *   node verify-gates.mjs --gate=4       # 门禁 4：计算并核对契约/Schema/锁文件 SHA-256 指纹
 *   node verify-gates.mjs --all          # 本地一键执行 Gate 1 + 2 + 4
 */
import { createHash } from 'node:crypto'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const cwd = process.cwd()

function walkFiles(dir, exts = null, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(fullPath, exts, results)
    } else if (!exts || exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath)
    }
  }
  return results
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath)
  return createHash('sha256').update(buf).digest('hex')
}

function sha256Directory(dirPath) {
  if (!fs.existsSync(dirPath)) return null
  const files = walkFiles(dirPath).sort()
  if (files.length === 0) return null
  const hash = createHash('sha256')
  for (const file of files) {
    const rel = path.relative(dirPath, file).replace(/\\/g, '/')
    hash.update(rel + ':' + sha256File(file) + '\n')
  }
  return hash.digest('hex')
}

function runSelfCheck() {
  const testDigest = createHash('sha256').update('v0.9.0-gate-check').digest('hex')
  if (testDigest.length !== 64) {
    console.error('❌ SHA-256 digest self-check failed.')
    process.exit(1)
  }
  console.log('✅ verify-gates.mjs self-check passed (Node ' + process.version + ', SHA-256 ready).')
}

function runGate1() {
  console.log('🔍 [Gate 1] 检查需求-验收-测试闭环标记 (@req / @ac) 与 SQLite 禁用项...')
  const testDirs = ['tests', 'test', 'src'].map((d) => path.join(cwd, d))
  const testFiles = testDirs.flatMap((d) =>
    walkFiles(d, ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'])
  )

  if (testFiles.length === 0) {
    console.error('❌ [Gate 1] 未找到任何 .test.ts(x) / .spec.ts(x) 测试文件，违背测试先行闭环 (STD-QA-01/13)。')
    process.exit(1)
  }

  const missingTags = []
  for (const file of testFiles) {
    const content = fs.readFileSync(file, 'utf8')
    const hasReq = /@req\s+REQ-\d+/i.test(content)
    const hasAc = /@ac\s+AC-\d+/i.test(content)
    if (!hasReq || !hasAc) {
      missingTags.push(path.relative(cwd, file))
    }
  }

  if (missingTags.length > 0) {
    console.error('❌ [Gate 1] 以下测试文件缺少 // @req REQ-xxx @ac AC-xxx 闭环追溯标签：')
    missingTags.forEach((f) => console.error('   - ' + f))
    process.exit(1)
  }

  // 检查 Prisma 是否误用了被禁用的 sqlite
  const schemaPath = path.join(cwd, 'prisma', 'schema.prisma')
  if (fs.existsSync(schemaPath)) {
    const schemaText = fs.readFileSync(schemaPath, 'utf8')
    if (/provider\s*=\s*["']sqlite["']/i.test(schemaText)) {
      console.error('❌ [Gate 1] 检测到 prisma/schema.prisma 使用了 SQLite，违反团队 PostgreSQL 统一标准 (STD-ARC-09)。')
      process.exit(1)
    }
  }

  console.log(`✅ [Gate 1] 通过：共核验 ${testFiles.length} 个测试文件均绑定 @req 与 @ac 标签。`)
}

function runGate2() {
  console.log('🔍 [Gate 2] 扫描防作弊规则 (.skip / .only / 空 catch / Vue 禁用混入)...')
  const scanFiles = walkFiles(path.join(cwd, 'src'), ['.ts', '.tsx', '.js', '.jsx']).concat(
    walkFiles(path.join(cwd, 'tests'), ['.ts', '.tsx', '.js', '.jsx'])
  )

  const violations = []
  for (const file of scanFiles) {
    const rel = path.relative(cwd, file)
    const content = fs.readFileSync(file, 'utf8')
    if (/\b(?:it|test|describe)\.(?:skip|only)\s*\(/.test(content) || /\bx(?:it|test|describe)\s*\(/.test(content)) {
      violations.push(`${rel}: 存在 .skip / .only 或 xit 跳过/独占测试`)
    }
    if (/catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(content)) {
      violations.push(`${rel}: 存在空 catch 块吞掉异常 (违反 STD-CODE-08)`)
    }
  }

  // 禁止 .env 被 Git 跟踪
  try {
    const trackedEnv = execSync('git ls-files .env .env.local .env.production', { encoding: 'utf8' }).trim()
    if (trackedEnv) {
      violations.push(`Git 中已跟踪敏感环境文件: ${trackedEnv} (违反 STD-SEC-03 / STD-CODE-11)`)
    }
  } catch {
    // 非 Git 目录时跳过 ls-files 检查
  }

  if (violations.length > 0) {
    console.error('❌ [Gate 2] 发现静态防作弊违规项：')
    violations.forEach((v) => console.error('   - ' + v))
    process.exit(1)
  }

  console.log(`✅ [Gate 2] 通过：扫描 ${scanFiles.length} 个源码与测试文件，未发现跳过测试或吞异常行为。`)
}

function runGate4() {
  console.log('🔍 [Gate 4] 计算并校验三重 SHA-256 指纹 (STD-AUD-07)...')
  const contractCandidates = [
    path.join(cwd, 'shared', 'contracts'),
    path.join(cwd, 'src', 'contracts'),
    path.join(cwd, 'contracts')
  ]
  const contractDir = contractCandidates.find((d) => fs.existsSync(d))
  const contractHash = contractDir ? sha256Directory(contractDir) : 'NONE'

  const schemaPath = path.join(cwd, 'prisma', 'schema.prisma')
  const schemaHash = fs.existsSync(schemaPath) ? sha256File(schemaPath) : 'NONE'

  const lockCandidates = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'].map((f) => path.join(cwd, f))
  const lockFile = lockCandidates.find((f) => fs.existsSync(f))
  const lockHash = lockFile ? sha256File(lockFile) : 'NONE'

  let gitCommit = 'UNCOMMITTED'
  try {
    gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    // ignore if not a git repo
  }

  const fingerprintReport = {
    generatedAt: new Date().toISOString(),
    gitCommit,
    contractFingerprintSha256: contractHash,
    prismaSchemaFingerprintSha256: schemaHash,
    lockfileFingerprintSha256: lockHash
  }

  // 若项目存在 docs/evidence/fingerprint-lock.json，则校验关键指纹是否发生了未重验的漂移
  const lockRecordPath = path.join(cwd, 'docs', 'evidence', 'fingerprint-lock.json')
  if (fs.existsSync(lockRecordPath)) {
    const locked = JSON.parse(fs.readFileSync(lockRecordPath, 'utf8'))
    if (
      (locked.contractFingerprintSha256 && locked.contractFingerprintSha256 !== contractHash) ||
      (locked.prismaSchemaFingerprintSha256 && locked.prismaSchemaFingerprintSha256 !== schemaHash)
    ) {
      console.error('❌ [Gate 4] 检测到契约或 Prisma Schema 指纹已变化，当前 T07/T12 验收证据已失效 (Stale)！')
      console.error('   已锁定指纹:', JSON.stringify(locked))
      console.error('   当前指纹  :', JSON.stringify(fingerprintReport))
      process.exit(1)
    }
  }

  console.log('✅ [Gate 4] 三重指纹核验完成（可直接复制填入 T12 验收报告）：')
  console.log(JSON.stringify(fingerprintReport, null, 2))
}

if (args.includes('--self-check')) {
  runSelfCheck()
} else if (args.includes('--gate=1')) {
  runGate1()
} else if (args.includes('--gate=2')) {
  runGate2()
} else if (args.includes('--gate=4')) {
  runGate4()
} else if (args.includes('--all')) {
  runGate1()
  runGate2()
  runGate4()
} else {
  console.log('用法: node verify-gates.mjs [--self-check | --gate=1 | --gate=2 | --gate=4 | --all]')
}
