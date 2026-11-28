#!/usr/bin/env node
/**
 * 软件产品设计与全栈交付工作流 v1.4.0 — CI 四道门禁、双向闭环与五重指纹校验脚本
 * 对应规则：STD-GOV-03（闭环）、STD-GOV-05（索引树）、STD-SEC-05（安全红线）、STD-QA-13（四道门禁）、STD-AUD-07（指纹锁定）
 *
 * 用法：
 *   node verify-gates.mjs --self-check                      # 校验工作流内脚本自检
 *   node verify-gates.mjs --gate=1 [--scope=minor]          # 门禁 1：docs/ ↔ tests/ 双向 REQ/AC 关联核对 + 禁用 SQLite + 索引树新鲜度
 *   node verify-gates.mjs --gate=2                          # 门禁 2：静态基线防呆（.skip/.only/.fixme、空 catch、前端禁 node:crypto/localStorage 存令牌、禁旧栈）
 *   node verify-gates.mjs --gate=4 [--strict-lock]          # 门禁 4：计算并核对契约/Schema/锁文件/源码树/交付资产五重 SHA-256 指纹
 *   node verify-gates.mjs --gate=4 --lock                   # 门禁 4（锁定）：写入 docs/evidence/fingerprint-lock.json 验收基线
 *   node verify-gates.mjs --all [--scope=minor]             # 本地一键执行 Gate 1 + 2 + 4
 *   可选 .workflow-profile.json：用于已有工程 (existing-web) / 移动模式 A (mobile-mode-a) 声明 legacyApprovalRef 与既有依赖白名单
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

const REQUIRED_LOCK_FIELDS = [
  'contractFingerprintSha256',
  'prismaSchemaFingerprintSha256',
  'lockfileFingerprintSha256',
  'sourceTreeFingerprintSha256',
  'deliveryAssetsFingerprintSha256'
]

const SHA256_OR_NONE_RE = /^(?:NONE|[0-9a-f]{64})$/
const ALLOWED_PROJECT_TYPES = new Set(['golden-fullstack', 'existing-web', 'mobile-mode-a'])

export function validateWorkflowProfile(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, reason: '.workflow-profile.json 必须是合法 JSON 对象' }
  }
  const { projectType, allowedLegacyDeps, allowLegacyVueFiles, skipDatabaseCheck, legacyApprovalRef } = raw
  if (typeof projectType !== 'string' || !ALLOWED_PROJECT_TYPES.has(projectType)) {
    return {
      ok: false,
      reason: 'projectType 必须为 golden-fullstack | existing-web | mobile-mode-a 之一'
    }
  }
  if (allowedLegacyDeps !== undefined) {
    if (!Array.isArray(allowedLegacyDeps) || allowedLegacyDeps.some((d) => typeof d !== 'string' || !BANNED_PACKAGES.includes(d))) {
      return {
        ok: false,
        reason: `allowedLegacyDeps 必须是字符串数组且仅可包含已识别的旧栈包名 (${BANNED_PACKAGES.join(', ')})`
      }
    }
  }
  if (allowLegacyVueFiles !== undefined && typeof allowLegacyVueFiles !== 'boolean') {
    return { ok: false, reason: 'allowLegacyVueFiles 必须为布尔值' }
  }
  if (skipDatabaseCheck !== undefined && typeof skipDatabaseCheck !== 'boolean') {
    return { ok: false, reason: 'skipDatabaseCheck 必须为布尔值' }
  }

  const normalizedDeps = allowedLegacyDeps ?? []
  const normalizedVue = allowLegacyVueFiles ?? false
  const normalizedSkipDb = skipDatabaseCheck !== undefined ? skipDatabaseCheck : projectType === 'mobile-mode-a'

  if (projectType === 'golden-fullstack') {
    if (normalizedDeps.length > 0 || normalizedVue === true || normalizedSkipDb === true) {
      return {
        ok: false,
        reason: 'golden-fullstack 新项目禁止启用 allowedLegacyDeps / allowLegacyVueFiles / skipDatabaseCheck 豁免'
      }
    }
  } else {
    if (typeof legacyApprovalRef !== 'string' || legacyApprovalRef.trim().length === 0) {
      return {
        ok: false,
        reason: `${projectType} 裁剪配置必须提供非空的 legacyApprovalRef（如 "T01" 或 "ADR-001"）`
      }
    }
  }

  return {
    ok: true,
    profile: {
      projectType,
      allowedLegacyDeps: normalizedDeps,
      allowLegacyVueFiles: normalizedVue,
      skipDatabaseCheck: normalizedSkipDb,
      legacyApprovalRef: typeof legacyApprovalRef === 'string' && legacyApprovalRef.trim() ? legacyApprovalRef.trim() : null
    }
  }
}

function loadWorkflowProfile(targetDir) {
  const profilePath = path.join(targetDir, '.workflow-profile.json')
  if (!fs.existsSync(profilePath)) {
    return {
      projectType: 'golden-fullstack',
      allowedLegacyDeps: [],
      allowLegacyVueFiles: false,
      skipDatabaseCheck: false,
      legacyApprovalRef: null
    }
  }
  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
  } catch {
    console.error('❌ [Workflow Profile] .workflow-profile.json 不是合法 JSON！')
    process.exit(1)
  }
  const validated = validateWorkflowProfile(parsed)
  if (!validated.ok) {
    console.error(`❌ [Workflow Profile] .workflow-profile.json 配置无效：${validated.reason}`)
    process.exit(1)
  }
  return validated.profile
}

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
  if (buf.includes(0)) return buf
  return Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
}

function sha256File(filePath) {
  const buf = normalizeBufferForHash(fs.readFileSync(filePath))
  return createHash('sha256').update(buf).digest('hex')
}

export function sortPosixPaths(pathsList) {
  return [...pathsList].sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))
}

function sha256Directory(dirPath) {
  const items = sortPosixPaths(
    walkFiles(dirPath).map((fullPath) => ({
      fullPath,
      rel: path.relative(dirPath, fullPath).replace(/\\/g, '/')
    }))
  )
  const hash = createHash('sha256')
  for (const item of items) {
    hash.update(item.rel + '\n')
    hash.update(normalizeBufferForHash(fs.readFileSync(item.fullPath)))
  }
  return hash.digest('hex')
}

function sha256Targets(targetPaths) {
  const collected = []
  for (const target of targetPaths) {
    if (!fs.existsSync(target)) continue
    const stat = fs.statSync(target)
    if (stat.isDirectory()) {
      for (const f of walkFiles(target)) {
        collected.push({
          fullPath: f,
          rel: path.relative(cwd, f).replace(/\\/g, '/')
        })
      }
    } else if (stat.isFile()) {
      collected.push({
        fullPath: target,
        rel: path.relative(cwd, target).replace(/\\/g, '/')
      })
    }
  }
  if (collected.length === 0) return 'NONE'
  const sorted = sortPosixPaths(collected)
  const hash = createHash('sha256')
  for (const item of sorted) {
    hash.update(item.rel + '\n')
    hash.update(normalizeBufferForHash(fs.readFileSync(item.fullPath)))
  }
  return hash.digest('hex')
}

export function validateLockSchema(locked) {
  if (!locked || typeof locked !== 'object' || Array.isArray(locked)) {
    return { ok: false, reason: 'fingerprint-lock.json 必须是合法 JSON 对象' }
  }
  for (const key of REQUIRED_LOCK_FIELDS) {
    const val = locked[key]
    if (typeof val !== 'string' || !SHA256_OR_NONE_RE.test(val)) {
      return { ok: false, reason: `锁文件缺少或损坏必填指纹字段 "${key}"` }
    }
  }
  return { ok: true }
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
  const testDigest = createHash('sha256').update('v1.4.0-gate-check').digest('hex')
  if (testDigest.length !== 64) {
    console.error('❌ SHA-256 digest self-check failed.')
    process.exit(1)
  }

  // 验证 POSIX 排序一致性（nested/a.ts 排在 nested0.ts 之前）与空锁拒绝
  const sortedSample = sortPosixPaths([{ rel: 'nested0.ts' }, { rel: 'nested/a.ts' }])
  if (sortedSample[0]?.rel !== 'nested/a.ts') {
    console.error('❌ POSIX sort self-check failed.')
    process.exit(1)
  }
  if (validateLockSchema({}).ok) {
    console.error('❌ Empty lock rejection self-check failed.')
    process.exit(1)
  }
  if (validateWorkflowProfile({ projectType: 'golden-fullstack', allowedLegacyDeps: ['vue'] }).ok) {
    console.error('❌ golden-fullstack legacy dependency exemption rejection self-check failed.')
    process.exit(1)
  }
  if (validateWorkflowProfile({ projectType: 'existing-web', allowedLegacyDeps: ['vue'] }).ok) {
    console.error('❌ existing-web missing legacyApprovalRef rejection self-check failed.')
    process.exit(1)
  }
  if (
    !validateWorkflowProfile({
      projectType: 'existing-web',
      legacyApprovalRef: 'T01',
      allowedLegacyDeps: ['vue'],
      allowLegacyVueFiles: true
    }).ok
  ) {
    console.error('❌ valid existing-web profile self-check failed.')
    process.exit(1)
  }
  if (!validateWorkflowProfile({ projectType: 'mobile-mode-a', legacyApprovalRef: 'T13' }).ok) {
    console.error('❌ valid mobile-mode-a profile self-check failed.')
    process.exit(1)
  }

  const subChecks = [
    path.join(scriptDir, 'build-index-tree.mjs'),
    path.join(scriptDir, 'safe-db-reset.mjs'),
    path.resolve(scriptDir, '..', 'starter', 'init-project.mjs'),
    path.resolve(scriptDir, '..', 'deploy', 'backup-postgres.mjs'),
    path.resolve(scriptDir, '..', 'deploy', 'run-migrate.mjs')
  ]
  for (const sub of subChecks) {
    if (fs.existsSync(sub)) {
      const res = spawnSync(process.execPath, [sub, '--self-check'], { stdio: 'inherit' })
      if (res.status !== 0) process.exit(res.status || 1)
    }
  }
  console.log('✅ verify-gates.mjs v1.4.0 self-check passed (Node ' + process.version + ', POSIX sort + strict lock + Gate 1/2/4 ready).')
}

function runGate1(profile, changeScope = 'standard') {
  console.log('🔍 [Gate 1] 检查双向 REQ/AC 标签关联、禁用 SQLite 与索引树新鲜度...')
  if (changeScope === 'minor') {
    console.log('ℹ️ [Gate 1] 小变更路径 (--scope=minor)：仅核验既有测试无幽灵标签、数据库约束与索引树新鲜度（低风险文案/样式修改不强制新增 REQ/AC 骨架；涉及权限/资金/契约/数据模型严禁使用 minor）。')
  }

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
      console.log('ℹ️ [Gate 1] 当前为 S0 初始底座（docs/ 尚未声明 REQ/AC 且暂无测试文件），跳过标签关联核对，继续检查 Prisma 与索引树。')
    } else if (changeScope === 'minor') {
      console.log(`ℹ️ [Gate 1] 小变更路径 (--scope=minor)：docs/ 存在 ${docReqs.size} 个 REQ / ${docAcs.size} 个 AC，暂无测试文件，继续执行数据库与索引树核验。`)
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

    const uncoveredReqs = [...docReqs].filter((id) => !coveredReqs.has(id)).sort()
    const uncoveredAcs = [...docAcs].filter((id) => !coveredAcs.has(id)).sort()
    // 无论 docs/ 是否为空，绝不允许测试引用 docs/ 中未定义的幽灵编号
    const ghostReqs = [...coveredReqs].filter((id) => !docReqs.has(id)).sort()
    const ghostAcs = [...coveredAcs].filter((id) => !docAcs.has(id)).sort()

    if (uncoveredReqs.length > 0 || uncoveredAcs.length > 0) {
      console.error('❌ [Gate 1] 需求文档 (docs/) 与测试代码 (tests/) 未形成闭环，以下条目缺少测试标签关联：')
      if (uncoveredReqs.length > 0) console.error('   - 漏测 REQ: ' + uncoveredReqs.join(', '))
      if (uncoveredAcs.length > 0) console.error('   - 漏测 AC : ' + uncoveredAcs.join(', '))
      process.exit(1)
    }
    if (ghostReqs.length > 0 || ghostAcs.length > 0) {
      console.error('❌ [Gate 1] 测试引用了 docs/ 需求文档中未定义的幽灵编号（空需求文档同样禁止孤立测试标签），请同步需求规格：')
      if (ghostReqs.length > 0) console.error('   - 未定义 REQ: ' + ghostReqs.join(', '))
      if (ghostAcs.length > 0) console.error('   - 未定义 AC : ' + ghostAcs.join(', '))
      process.exit(1)
    }
    console.log(`✅ [Gate 1] 标签关联核对通过：docs/ 全部 ${docReqs.size} 个 REQ 与 ${docAcs.size} 个 AC 均已在测试文件中声明关联（实际运行通过请核验 Gate 3）。`)
  }

  if (profile.skipDatabaseCheck) {
    console.log(`ℹ️ [Gate 1] 已按 .workflow-profile.json (${profile.projectType}, ${profile.legacyApprovalRef}) 跳过后端 Prisma 检查。`)
  } else {
    const schemaPath = path.join(cwd, 'prisma', 'schema.prisma')
    if (fs.existsSync(schemaPath)) {
      const schemaText = fs.readFileSync(schemaPath, 'utf8')
      if (/provider\s*=\s*["']sqlite["']/i.test(schemaText)) {
        console.error('❌ [Gate 1] 检测到 prisma/schema.prisma 使用了 SQLite，违反团队 PostgreSQL 统一标准 (STD-ARC-09)。')
        process.exit(1)
      }
    }
  }

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

function runGate2(profile) {
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
    if (rel.startsWith('src/') && !rel.startsWith('src/server/') && !rel.startsWith('src/api/')) {
      if (/from\s+['"](?:node:crypto|crypto)['"]|fingerprint\.server/.test(content)) {
        violations.push(`${rel}: 浏览器前端源码不得导入 node:crypto 或 fingerprint.server（防止 Vite 打包失败，见 STD-API-07）`)
      }
      if (/localStorage\.setItem\s*\(\s*['"][^'"]*(?:token|jwt|session|auth|secret|password)[^'"]*['"]/i.test(content)) {
        violations.push(`${rel}: 禁止在 localStorage 中存储登录凭据/Token，须改用 HttpOnly Cookie 会话 (违反 STD-SEC-05)`)
      }
    }
  }

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

  const vueFiles = walkFiles(path.join(cwd, 'src'), ['.vue'])
  if (vueFiles.length > 0) {
    if (profile.projectType === 'existing-web' && profile.allowLegacyVueFiles) {
      console.log(`ℹ️ [Gate 2] 已有项目 (${profile.legacyApprovalRef}) 豁免既有 .vue 文件检查（共 ${vueFiles.length} 个，仅允许维护既有工程，禁止无授权新建重写）。`)
    } else {
      for (const vf of vueFiles) {
        violations.push(`${path.relative(cwd, vf)}: 检测到 .vue 文件，违反 React 黄金栈标准 (STD-ARC-09 / STD-REACT-01)`)
      }
    }
  }
  const allowedLegacySet = new Set(profile.projectType !== 'golden-fullstack' ? profile.allowedLegacyDeps : [])
  if (allowedLegacySet.size > 0) {
    console.log(`ℹ️ [Gate 2] 已有项目 (${profile.legacyApprovalRef}) 允许已登记既有依赖: [${[...allowedLegacySet].join(', ')}]；其余禁用栈仍拦截。`)
  }
  const pkgPath = path.join(cwd, 'package.json')
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    for (const banned of BANNED_PACKAGES) {
      if (Object.prototype.hasOwnProperty.call(allDeps, banned) && !allowedLegacySet.has(banned)) {
        violations.push(`package.json 包含被禁用的旧技术栈依赖 "${banned}" (违反 STD-ARC-09)`)
      }
    }
  }

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

function runGate4(shouldLock = false, strictLock = false) {
  console.log('🔍 [Gate 4] 计算并校验五重 SHA-256 指纹 (契约 / Schema / 锁文件 / 源码树 / 交付迁移测试资产, STD-AUD-07)...')
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

  const sourceTreeHash = sha256Targets([
    path.join(cwd, 'src'),
    path.join(cwd, 'server'),
    path.join(cwd, 'shared')
  ])

  const deliveryAssetsHash = sha256Targets([
    path.join(cwd, 'prisma', 'migrations'),
    path.join(cwd, 'tests'),
    path.join(cwd, 'package.json'),
    path.join(cwd, 'vite.config.ts'),
    path.join(cwd, 'tsconfig.json'),
    path.join(cwd, 'Dockerfile'),
    path.join(cwd, 'docker-compose.prod.yml'),
    path.join(cwd, 'Caddyfile')
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
    sourceTreeFingerprintSha256: sourceTreeHash,
    deliveryAssetsFingerprintSha256: deliveryAssetsHash
  }

  const lockRecordPath = path.join(cwd, 'docs', 'evidence', 'fingerprint-lock.json')

  if (shouldLock) {
    fs.mkdirSync(path.dirname(lockRecordPath), { recursive: true })
    fs.writeFileSync(lockRecordPath, JSON.stringify(fingerprintReport, null, 2) + '\n', 'utf8')
    console.log('✅ [Gate 4] 已生成五重验收指纹锁文件：docs/evidence/fingerprint-lock.json')
    console.log(JSON.stringify(fingerprintReport, null, 2))
    return
  }

  if (fs.existsSync(lockRecordPath)) {
    let locked
    try {
      locked = JSON.parse(fs.readFileSync(lockRecordPath, 'utf8'))
    } catch {
      console.error('❌ [Gate 4] docs/evidence/fingerprint-lock.json 不是合法 JSON，拒绝放行！')
      process.exit(1)
    }
    const schemaCheck = validateLockSchema(locked)
    if (!schemaCheck.ok) {
      console.error(`❌ [Gate 4] 验收指纹锁文件不完整 (${schemaCheck.reason})，禁止空锁绕过！请重新验收并运行 \`npm run gates:lock\`。`)
      process.exit(1)
    }

    const drifted = []
    if (locked.contractFingerprintSha256 !== contractHash) drifted.push('contracts')
    if (locked.prismaSchemaFingerprintSha256 !== schemaHash) drifted.push('prisma/schema.prisma')
    if (locked.lockfileFingerprintSha256 !== lockHash) drifted.push('lockfile')
    if (locked.sourceTreeFingerprintSha256 !== sourceTreeHash) drifted.push('sourceTree(src/server/shared)')
    if (locked.deliveryAssetsFingerprintSha256 !== deliveryAssetsHash) drifted.push('deliveryAssets(migrations/tests/config/deploy)')

    if (drifted.length > 0) {
      console.error(`❌ [Gate 4] 检测到以下指纹已偏离验收基线 (${drifted.join(', ')})，当前 T07/T12 验收证据已失效 (Stale)！`)
      console.error('   请重新执行验收后运行 `npm run gates:lock` 刷新基线。')
      console.error('   已锁定指纹:', JSON.stringify(locked))
      console.error('   当前指纹  :', JSON.stringify(fingerprintReport))
      process.exit(1)
    }
    console.log('✅ [Gate 4] 五重指纹与 docs/evidence/fingerprint-lock.json 校验一致：')
  } else {
    if (strictLock) {
      console.error('❌ [Gate 4] 已启用 --strict-lock，但缺少 docs/evidence/fingerprint-lock.json！验收发布前必须先运行 `npm run gates:lock`。')
      process.exit(1)
    }
    console.log('ℹ️ [Gate 4] 尚未生成 docs/evidence/fingerprint-lock.json，本次仅输出当前指纹；验收通过后请运行 `npm run gates:lock` 锁定基线：')
  }
  console.log(JSON.stringify(fingerprintReport, null, 2))
}

const shouldLock = args.includes('--lock')
const strictLock = args.includes('--strict-lock')
const scopeArg = args.find((a) => a.startsWith('--scope='))
const changeScope = scopeArg ? scopeArg.slice('--scope='.length) : 'standard'
const entryArg = process.argv[1]
const isMain =
  entryArg !== undefined &&
  path.resolve(entryArg) === path.resolve(fileURLToPath(import.meta.url))

if (isMain) {
  if (changeScope !== 'standard' && changeScope !== 'minor') {
    console.error(`❌ 无效 --scope 参数 "${changeScope}"，仅支持 standard 或 minor。`)
    process.exit(1)
  }

  if (args.includes('--self-check')) {
    runSelfCheck()
  } else if (args.includes('--gate=1')) {
    const profile = loadWorkflowProfile(cwd)
    runGate1(profile, changeScope)
  } else if (args.includes('--gate=2')) {
    const profile = loadWorkflowProfile(cwd)
    runGate2(profile)
  } else if (args.includes('--gate=4')) {
    runGate4(shouldLock, strictLock)
  } else if (args.includes('--all')) {
    const profile = loadWorkflowProfile(cwd)
    runGate1(profile, changeScope)
    runGate2(profile)
    runGate4(shouldLock, strictLock)
  } else {
    console.log('用法: node verify-gates.mjs [--self-check | --gate=1 [--scope=minor] | --gate=2 | --gate=4 [--lock] [--strict-lock] | --all [--scope=minor]]')
  }
}
