#!/usr/bin/env node
/**
 * 软件产品设计与全栈交付工作流 v1.3.1 — CI 四道门禁、双向闭环与四重指纹校验脚本
 * 对应规则：STD-GOV-03（闭环）、STD-GOV-05（索引树）、STD-SEC-05（安全红线）、STD-QA-13（四道门禁）、STD-AUD-07（指纹锁定）
 *
 * 用法：
 *   node verify-gates.mjs --self-check       # 校验工作流内脚本自检
 *   node verify-gates.mjs --gate=1           # 门禁 1：docs/ ↔ tests/ 双向 REQ/AC 覆盖核对 + 禁用 SQLite + 索引树新鲜度（S0 空白底座自动豁免测试数）
 *   node verify-gates.mjs --gate=2           # 门禁 2：静态基线防呆（.skip/.only/.fixme、空 catch、前端禁 node:crypto/localStorage 存令牌、禁旧栈）
 *   node verify-gates.mjs --gate=4           # 门禁 4：计算并核对契约/Schema/锁文件/源码树四重 SHA-256 指纹
 *   node verify-gates.mjs --gate=4 --lock    # 门禁 4（锁定）：写入 docs/evidence/fingerprint-lock.json 验收基线
 *   node verify-gates.mjs --all              # 本地一键执行 Gate 1 + 2 + 4
 */
import { createHash } from 'node:crypto'
import { execSync, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const cwd = process.cwd()
const scriptDir = path.dirname(fileURLToPath(import.meta.url))

const BANNED_PACKAGES = [
  'vue',
  'element-plus',
  'naive-ui',
  'better-sqlite3',
  'sqlite3',
  '@capacitor/core',
  '@dcloudio/uni-app'
]

function walkFiles(dir, exts = null, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === '.git' ||
      entry.name === 'dist' ||
      entry.name === 'dist-server' ||
      entry.name === 'playwright-report' ||
      entry.name === 'test-results'
    ) {
      continue
    }
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(fullPath, exts, results)
    } else if (!exts || exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath)
    }
  }
  return results
}

function normalizeBufferForHash(buf) {
  // 对非二进制文本文件统一将 CRLF 归一化为 LF，确保 Windows 本地与 Linux CI 计算的 SHA-256 完全一致
  if (buf.includes(0)) return buf
  return Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
}

function sha256File(filePath) {
  const buf = normalizeBufferForHash(fs.readFileSync(filePath))
  return createHash('sha256').update(buf).digest('hex')
}

function sha256Directory(dirPath) {
  const files = walkFiles(dirPath).sort()
  const hash = createHash('sha256')
  for (const f of files) {
    const rel = path.relative(dirPath, f).replace(/\\/g, '/')
    hash.update(rel + '\n')
    hash.update(normalizeBufferForHash(fs.readFileSync(f)))
  }
  return hash.digest('hex')
}

function sha256Directories(dirPaths) {
  const hash = createHash('sha256')
  let totalFiles = 0
  for (const dirPath of dirPaths) {
    if (!fs.existsSync(dirPath)) continue
    const files = walkFiles(dirPath).sort()
    for (const f of files) {
      const rel = path.relative(cwd, f).replace(/\\/g, '/')
      hash.update(rel + '\n')
      hash.update(normalizeBufferForHash(fs.readFileSync(f)))
      totalFiles++
    }
  }
  return totalFiles > 0 ? hash.digest('hex') : 'NONE'
}

function collectMatches(text, regex) {
  const found = new Set()
  let m
  while ((m = regex.exec(text)) !== null) {
    found.add(m[1].toUpperCase())
  }
  return found
}

function runSelfCheck() {
  const testDigest = createHash('sha256').update('v1.3.1-gate-check').digest('hex')
  if (testDigest.length !== 64) {
    console.error('❌ SHA-256 digest self-check failed.')
    process.exit(1)
  }
  const indexScript = path.join(scriptDir, 'build-index-tree.mjs')
  if (fs.existsSync(indexScript)) {
    const res = spawnSync(process.execPath, [indexScript, '--self-check'], { stdio: 'inherit' })
    if (res.status !== 0) process.exit(res.status || 1)
  }
  const starterScript = path.resolve(scriptDir, '..', 'starter', 'init-project.mjs')
  if (fs.existsSync(starterScript)) {
    const res = spawnSync(process.execPath, [starterScript, '--self-check'], { stdio: 'inherit' })
    if (res.status !== 0) process.exit(res.status || 1)
  }
  const backupScript = path.resolve(scriptDir, '..', 'deploy', 'backup-postgres.mjs')
  if (fs.existsSync(backupScript)) {
    const res = spawnSync(process.execPath, [backupScript, '--self-check'], { stdio: 'inherit' })
    if (res.status !== 0) process.exit(res.status || 1)
  }
  console.log('✅ verify-gates.mjs v1.3.1 self-check passed (Node ' + process.version + ', LF-normalized Gate 1/4 + Gate 2 baseline ready).')
}

function runGate1() {
  console.log('🔍 [Gate 1] 检查双向 REQ/AC 闭环覆盖、禁用 SQLite 与索引树新鲜度...')

  // 先扫描 docs/ 中声明的 REQ-xxx 与 AC-xxx（排除 evidence/ 与 archive/）
  const docsDir = path.join(cwd, 'docs')
  const docReqs = new Set()
  const docAcs = new Set()
  if (fs.existsSync(docsDir)) {
    const docMdFiles = walkFiles(docsDir, ['.md']).filter((f) => {
      const rel = path.relative(docsDir, f).replace(/\\/g, '/')
      return !rel.startsWith('evidence/') && !rel.startsWith('archive/')
    })
    for (const df of docMdFiles) {
      const text = fs.readFileSync(df, 'utf8')
      collectMatches(text, /\b(REQ-\d+)\b/g).forEach((id) => docReqs.add(id))
      collectMatches(text, /\b(AC-\d+)\b/g).forEach((id) => docAcs.add(id))
    }
  }

  const testDirs = ['tests', 'test', 'src'].map((d) => path.join(cwd, d))
  const testFiles = testDirs.flatMap((d) =>
    walkFiles(d, ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'])
  )

  if (testFiles.length === 0) {
    if (docReqs.size === 0 && docAcs.size === 0) {
      console.log('ℹ️ [Gate 1] 当前为 S0 初始底座（docs/ 尚未声明 REQ/AC 且暂无测试文件），跳过测试覆盖核对，继续检查 Prisma 与索引树。')
    } else {
      console.error(`❌ [Gate 1] docs/ 已声明 ${docReqs.size} 个 REQ 与 ${docAcs.size} 个 AC，但未找到任何 .test.ts(x) / .spec.ts(x) 测试文件，违背测试先行闭环 (STD-QA-01/13)。`)
      process.exit(1)
    }
  } else {
    const missingTags = []
    const coveredReqs = new Set()
    const coveredAcs = new Set()

    for (const file of testFiles) {
      const content = fs.readFileSync(file, 'utf8')
      const fileReqs = collectMatches(content, /@req\s+(REQ-\d+)/gi)
      const fileAcs = collectMatches(content, /@ac\s+(AC-\d+)/gi)
      if (fileReqs.size === 0 || fileAcs.size === 0) {
        missingTags.push(path.relative(cwd, file))
      }
      fileReqs.forEach((id) => coveredReqs.add(id))
      fileAcs.forEach((id) => coveredAcs.add(id))
    }

    if (missingTags.length > 0) {
      console.error('❌ [Gate 1] 以下测试文件缺少 // @req REQ-xxx @ac AC-xxx 闭环追溯标签：')
      missingTags.forEach((f) => console.error('   - ' + f))
      process.exit(1)
    }

    if (docReqs.size > 0 || docAcs.size > 0) {
      const uncoveredReqs = [...docReqs].filter((id) => !coveredReqs.has(id)).sort()
      const uncoveredAcs = [...docAcs].filter((id) => !coveredAcs.has(id)).sort()
      const ghostReqs = docReqs.size > 0 ? [...coveredReqs].filter((id) => !docReqs.has(id)).sort() : []
      const ghostAcs = docAcs.size > 0 ? [...coveredAcs].filter((id) => !docAcs.has(id)).sort() : []

      if (uncoveredReqs.length > 0 || uncoveredAcs.length > 0) {
        console.error('❌ [Gate 1] 需求文档 (docs/) 与测试代码 (tests/) 未形成闭环，以下条目缺少测试覆盖：')
        if (uncoveredReqs.length > 0) console.error('   - 漏测 REQ: ' + uncoveredReqs.join(', '))
        if (uncoveredAcs.length > 0) console.error('   - 漏测 AC : ' + uncoveredAcs.join(', '))
        process.exit(1)
      }
      if (ghostReqs.length > 0 || ghostAcs.length > 0) {
        console.error('❌ [Gate 1] 测试引用了 docs/ 需求文档中未定义的幽灵编号，请同步需求规格：')
        if (ghostReqs.length > 0) console.error('   - 未定义 REQ: ' + ghostReqs.join(', '))
        if (ghostAcs.length > 0) console.error('   - 未定义 AC : ' + ghostAcs.join(', '))
        process.exit(1)
      }
      console.log(`✅ [Gate 1] 双向闭环核对通过：docs/ 全部 ${docReqs.size} 个 REQ 与 ${docAcs.size} 个 AC 均被测试覆盖。`)
    }
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

  // 检查项目资产索引树是否已生成且保持新鲜 (STD-GOV-05)
  const projectIndexScript = fs.existsSync(path.join(cwd, 'scripts', 'build-index-tree.mjs'))
    ? path.join(cwd, 'scripts', 'build-index-tree.mjs')
    : path.join(scriptDir, 'build-index-tree.mjs')

  if (fs.existsSync(projectIndexScript)) {
    const res = spawnSync(process.execPath, [projectIndexScript, '--check'], { cwd, stdio: 'inherit' })
    if (res.status !== 0) {
      process.exit(res.status || 1)
    }
  }

  console.log(`✅ [Gate 1] 通过：已核验 ${testFiles.length} 个测试文件，PostgreSQL 与索引树均合规。`)
}

function runGate2() {
  console.log('🔍 [Gate 2] 扫描静态基线防呆 (.skip/.only/.fixme / 空 catch / 前端禁 node:crypto 与常见 localStorage 存令牌 / 禁旧栈)...')
  const srcFiles = walkFiles(path.join(cwd, 'src'), ['.ts', '.tsx', '.js', '.jsx'])
  const serverFiles = walkFiles(path.join(cwd, 'server'), ['.ts', '.tsx', '.js', '.jsx'])
  const testFiles = walkFiles(path.join(cwd, 'tests'), ['.ts', '.tsx', '.js', '.jsx'])
  const scanFiles = [...srcFiles, ...serverFiles, ...testFiles]

  const violations = []
  for (const file of scanFiles) {
    const rel = path.relative(cwd, file).replace(/\\/g, '/')
    const content = fs.readFileSync(file, 'utf8')
    if (/\b(?:it|test|describe)\.(?:skip|only|fixme)\s*\(/.test(content) || /\bx(?:it|test|describe)\s*\(/.test(content)) {
      violations.push(`${rel}: 存在 .skip / .only / .fixme 或 xit 跳过/独占测试`)
    }
    if (/catch\s*(?:\([^)]*\))?\s*\{\s*\}/.test(content)) {
      violations.push(`${rel}: 存在空 catch 块吞掉异常 (违反 STD-CODE-08)`)
    }
    // 浏览器前端源码静态基线提醒（正则检查，不能替代运行时 Playwright 与独立安全审计）
    if (rel.startsWith('src/') && !rel.startsWith('src/server/') && !rel.startsWith('src/api/')) {
      if (/from\s+['"](?:node:crypto|crypto)['"]|fingerprint\.server/.test(content)) {
        violations.push(`${rel}: 浏览器前端源码不得导入 node:crypto 或 fingerprint.server（防止 Vite 打包失败，见 STD-API-07）`)
      }
      if (/localStorage\.setItem\s*\(\s*['"][^'"]*(?:token|jwt|session|auth|secret|password)[^'"]*['"]/i.test(content)) {
        violations.push(`${rel}: 禁止在 localStorage 中存储登录凭据/Token，须改用 HttpOnly Cookie 会话 (违反 STD-SEC-05)`)
      }
    }
  }

  // 检查同构契约文件自身不误引 node:crypto
  const isoContractCandidates = [
    path.join(cwd, 'shared', 'contracts', 'base-contract.schema.ts'),
    path.join(cwd, 'contracts', 'base-contract.schema.ts')
  ]
  for (const cp of isoContractCandidates) {
    if (fs.existsSync(cp)) {
      const cText = fs.readFileSync(cp, 'utf8')
      if (/from\s+['"](?:node:crypto|crypto)['"]/.test(cText)) {
        violations.push(`${path.relative(cwd, cp)}: 同构契约文件包含 node:crypto，必须拆至 fingerprint.server.ts`)
      }
    }
  }

  // 扫描 .vue 文件与被禁用的技术栈依赖
  const vueFiles = walkFiles(path.join(cwd, 'src'), ['.vue'])
  for (const vf of vueFiles) {
    violations.push(`${path.relative(cwd, vf)}: 检测到 .vue 文件，违反 React 黄金栈标准 (STD-ARC-09 / STD-REACT-01)`)
  }
  const pkgPath = path.join(cwd, 'package.json')
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    for (const banned of BANNED_PACKAGES) {
      if (Object.prototype.hasOwnProperty.call(allDeps, banned)) {
        violations.push(`package.json 包含被禁用的旧技术栈依赖 "${banned}" (违反 STD-ARC-09)`)
      }
    }
  }

  // 禁止 .env 被 Git 跟踪
  try {
    const trackedEnv = execSync('git ls-files .env .env.local .env.production', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
    if (trackedEnv) {
      violations.push(`Git 中已跟踪敏感环境文件: ${trackedEnv} (违反 STD-SEC-03 / STD-CODE-11)`)
    }
  } catch {
    // 非 Git 目录时跳过 ls-files 检查
  }

  if (violations.length > 0) {
    console.error('❌ [Gate 2] 发现静态防呆或技术栈违规项：')
    violations.forEach((v) => console.error('   - ' + v))
    process.exit(1)
  }

  console.log(`✅ [Gate 2] 通过：扫描 ${scanFiles.length} 个源码与测试文件，静态基线检查合规（注：正则扫描为前置防呆，不替代运行时权限测试）。`)
}

function runGate4(shouldLock = false) {
  console.log('🔍 [Gate 4] 计算并校验四重 SHA-256 指纹 (契约 / Schema / 锁文件 / 源码树, STD-AUD-07)...')
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

  const sourceTreeHash = sha256Directories([
    path.join(cwd, 'src'),
    path.join(cwd, 'server'),
    path.join(cwd, 'shared')
  ])

  let gitCommit = 'UNCOMMITTED'
  try {
    gitCommit = execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
  } catch {
    // ignore if not a git repo
  }

  const fingerprintReport = {
    generatedAt: new Date().toISOString(),
    gitCommit,
    contractFingerprintSha256: contractHash,
    prismaSchemaFingerprintSha256: schemaHash,
    lockfileFingerprintSha256: lockHash,
    sourceTreeFingerprintSha256: sourceTreeHash
  }

  const lockRecordPath = path.join(cwd, 'docs', 'evidence', 'fingerprint-lock.json')

  if (shouldLock) {
    fs.mkdirSync(path.dirname(lockRecordPath), { recursive: true })
    fs.writeFileSync(lockRecordPath, JSON.stringify(fingerprintReport, null, 2) + '\n', 'utf8')
    console.log('✅ [Gate 4] 已生成验收指纹锁文件：docs/evidence/fingerprint-lock.json')
    console.log(JSON.stringify(fingerprintReport, null, 2))
    return
  }

  if (fs.existsSync(lockRecordPath)) {
    const locked = JSON.parse(fs.readFileSync(lockRecordPath, 'utf8'))
    const drifted = []
    if (locked.contractFingerprintSha256 && locked.contractFingerprintSha256 !== contractHash) drifted.push('contracts')
    if (locked.prismaSchemaFingerprintSha256 && locked.prismaSchemaFingerprintSha256 !== schemaHash) drifted.push('prisma/schema.prisma')
    if (locked.lockfileFingerprintSha256 && locked.lockfileFingerprintSha256 !== lockHash) drifted.push('lockfile')
    if (locked.sourceTreeFingerprintSha256 && locked.sourceTreeFingerprintSha256 !== sourceTreeHash) drifted.push('sourceTree(src/server/shared)')

    if (drifted.length > 0) {
      console.error(`❌ [Gate 4] 检测到以下指纹已偏离验收基线 (${drifted.join(', ')})，当前 T07/T12 验收证据已失效 (Stale)！`)
      console.error('   请重新执行验收后运行 `npm run gates:lock` 刷新基线。')
      console.error('   已锁定指纹:', JSON.stringify(locked))
      console.error('   当前指纹  :', JSON.stringify(fingerprintReport))
      process.exit(1)
    }
    console.log('✅ [Gate 4] 四重指纹与 docs/evidence/fingerprint-lock.json 校验一致：')
  } else {
    console.log('ℹ️ [Gate 4] 尚未生成 docs/evidence/fingerprint-lock.json，本次仅输出当前指纹；验收通过后请运行 `npm run gates:lock` 锁定基线：')
  }
  console.log(JSON.stringify(fingerprintReport, null, 2))
}

const shouldLock = args.includes('--lock')

if (args.includes('--self-check')) {
  runSelfCheck()
} else if (args.includes('--gate=1')) {
  runGate1()
} else if (args.includes('--gate=2')) {
  runGate2()
} else if (args.includes('--gate=4')) {
  runGate4(shouldLock)
} else if (args.includes('--all')) {
  runGate1()
  runGate2()
  runGate4(shouldLock)
} else {
  console.log('用法: node verify-gates.mjs [--self-check | --gate=1 | --gate=2 | --gate=4 [--lock] | --all]')
}
