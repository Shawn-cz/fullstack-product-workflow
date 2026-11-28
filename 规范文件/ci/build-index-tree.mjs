#!/usr/bin/env node
/**
 * 软件产品设计与全栈交付工作流 v1.4.0 — 项目资产索引树自动生成与新鲜度校验脚本
 * 对应规则：STD-GOV-05（项目资产索引树自动生成与首读纪律）、STD-CODE-01（复用优先）、STD-QA-13（CI Gate 1）
 *
 * 头部元信息标注约定（AI 创建源码/契约/测试文件时写入前 12 行内）：
 *   // @desc 一句话中文业务职责 | @req REQ-001 | @ac AC-001 | @api API-001 | @comp COMP-001
 *
 * 用法：
 *   node build-index-tree.mjs --self-check   # 工作流内脚本自检
 *   node build-index-tree.mjs --write        # 扫描当前项目并生成 PROJECT_INDEX_TREE.md 与 docs/index-tree.json
 *   node build-index-tree.mjs --check        # CI Gate 1 新鲜度校验（不改写文件，过期则非零退出）
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const cwd = process.cwd()

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-server',
  'build',
  'coverage',
  '.next',
  '.vite',
  '.turbo',
  'playwright-report',
  'test-results',
  '历史归档_勿喂给AI'
])

const TRACKED_EXTS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.prisma',
  '.sql',
  '.css',
  '.yaml',
  '.yml',
  '.md'
])

const DOMAIN_BUCKETS = [
  { key: 'docs', label: '1. 需求、设计与验收文档 (docs/)', test: (p) => /^docs\/.+\.md$/i.test(p) && !/^docs\/index-tree\.json$/i.test(p) },
  { key: 'contracts', label: '2. 通用与业务契约 (contracts/)', test: (p) => /^(?:shared\/contracts|src\/contracts|contracts)\//.test(p) },
  { key: 'database', label: '3. 数据库模型、迁移与种子 (prisma/)', test: (p) => /^prisma\/(?:schema\.prisma|migrations\/.+\.sql|seed\.ts|test-accounts\.ts)$/i.test(p) },
  { key: 'server', label: '4. 服务端入口与接口 (server / api)', test: (p) => /^(?:server|src\/server|src\/api|backend)\//.test(p) },
  { key: 'frontend_pages', label: '5. React 前端页面与路由 (pages / routes)', test: (p) => /^src\/(?:pages|routes|views|app)\//.test(p) },
  { key: 'frontend_components', label: '6. 可复用组件与 Hooks (components / hooks / stores)', test: (p) => /^src\/(?:components|hooks|stores|lib|utils)\//.test(p) },
  { key: 'frontend_other', label: '7. 其他源码模块 (src/)', test: (p) => /^src\//.test(p) },
  { key: 'tests', label: '8. 自动化测试与闭环用例 (tests/)', test: (p) => /^(?:tests|test)\//.test(p) || /\.(?:test|spec)\.[tj]sx?$/.test(p) },
  { key: 'ci', label: '9. CI 门禁与工程脚本 (.github / scripts / docker)', test: (p) => /^(?:\.github\/workflows|scripts)\//.test(p) || /^docker-compose.*\.ya?ml$/i.test(p) }
]

function sha256Text(text) {
  return createHash('sha256').update(text.replace(/\r\n/g, '\n'), 'utf8').digest('hex')
}

function walkProjectFiles(rootDir, baseDir = rootDir, results = []) {
  if (!fs.existsSync(rootDir)) return results
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue
    const fullPath = path.join(rootDir, entry.name)
    if (entry.isDirectory()) {
      walkProjectFiles(fullPath, baseDir, results)
    } else {
      const rel = path.relative(baseDir, fullPath).replace(/\\/g, '/')
      if (rel === 'PROJECT_INDEX_TREE.md' || rel === 'docs/index-tree.json') continue
      const ext = path.extname(entry.name).toLowerCase()
      if (TRACKED_EXTS.has(ext)) {
        results.push({ fullPath, rel, ext })
      }
    }
  }
  return results.sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))
}

function matchAllIds(text, regex) {
  const found = new Set()
  let m
  while ((m = regex.exec(text)) !== null) {
    found.add(m[1].toUpperCase())
  }
  return [...found].sort()
}

export function extractFileMetadata(relPath, content) {
  const head = content.split(/\r?\n/).slice(0, 15).join('\n')

  // 提取 @desc（支持到行尾或下一个 | 分隔符）
  const descMatch = head.match(/@desc\s+([^|\r\n*]+)/i)
  let desc = descMatch ? descMatch[1].trim() : ''

  // Markdown 若无 @desc 则取首个 H1 标题
  if (!desc && relPath.endsWith('.md')) {
    const h1 = head.match(/^#\s+(.+)$/m)
    if (h1) desc = h1[1].trim()
  }

  const reqs = matchAllIds(head, /@req\s+(REQ-\d+)/gi)
  const acs = matchAllIds(head, /@ac\s+(AC-\d+)/gi)
  const apis = matchAllIds(head, /@api\s+(API-\d+)/gi)
  const comps = matchAllIds(head, /@comp\s+(COMP-\d+)/gi)

  // 提取第 3 层核心导出符号（上限 8 个，避免树体积膨胀）
  const symbols = []
  if (relPath.endsWith('.prisma')) {
    const modelMatches = content.matchAll(/^(?:model|enum)\s+(\w+)/gm)
    for (const m of modelMatches) symbols.push(m[1])
  } else if (/\.[tj]sx?$|\.mjs$/.test(relPath)) {
    const expMatches = content.matchAll(
      /^export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class|interface|type)\s+(\w+)/gm
    )
    for (const m of expMatches) {
      if (!symbols.includes(m[1])) symbols.push(m[1])
      if (symbols.length >= 8) break
    }
  }

  return {
    path: relPath,
    desc: desc || '待补 @desc 业务职责说明',
    hasDesc: Boolean(desc),
    tags: { reqs, acs, apis, comps },
    symbols,
    sha256: sha256Text(content)
  }
}

function classifyBucket(relPath) {
  // 测试文件优先归入 tests 桶，避免混入 src 桶
  if (/\.(?:test|spec)\.[tj]sx?$/.test(relPath) || /^(?:tests|test)\//.test(relPath)) {
    return 'tests'
  }
  for (const b of DOMAIN_BUCKETS) {
    if (b.key !== 'tests' && b.test(relPath)) return b.key
  }
  return null
}

function buildIndexData(rootDir) {
  const files = walkProjectFiles(rootDir)
  const buckets = Object.fromEntries(DOMAIN_BUCKETS.map((b) => [b.key, []]))
  const missingDesc = []

  for (const f of files) {
    const bucketKey = classifyBucket(f.rel)
    if (!bucketKey) continue
    const content = fs.readFileSync(f.fullPath, 'utf8')
    const meta = extractFileMetadata(f.rel, content)
    buckets[bucketKey].push(meta)
    if (!meta.hasDesc && /\.[tj]sx?$/.test(f.rel) && !/\.(?:test|spec)\.[tj]sx?$/.test(f.rel)) {
      missingDesc.push(f.rel)
    }
  }

  // 计算整棵树的确定性 SHA-256 指纹（用于 CI Gate 1 检测索引是否过期）
  const fingerprintSource = DOMAIN_BUCKETS.flatMap((b) =>
    buckets[b.key].map((item) => `${b.key}|${item.path}|${item.sha256}`)
  ).join('\n')
  const treeFingerprintSha256 = sha256Text(fingerprintSource)

  return {
    workflowVersion: '1.4.0',
    treeFingerprintSha256,
    totalIndexedFiles: Object.values(buckets).reduce((acc, arr) => acc + arr.length, 0),
    missingDescFiles: missingDesc,
    buckets
  }
}

function renderMarkdown(indexData) {
  const lines = [
    '# 项目资产语义索引树 (`PROJECT_INDEX_TREE.md`)',
    '',
    '> **自动生成文件，严禁手工编辑。** 由 `node scripts/build-index-tree.mjs --write` 扫描生成（规则 `STD-GOV-05`）。',
    '> 每次新开 AI 对话或执行 `S0`/`S4`/`S6` 查复用前，请**优先阅读本文件**以定位现有模块、组件、契约与测试，避免重复造轮子。',
    '',
    `- 索引文件总数：\`${indexData.totalIndexedFiles}\``,
    `- 整树 SHA-256 指纹：\`${indexData.treeFingerprintSha256}\``,
    `- 缺失 \`@desc\` 注释的业务源码数：\`${indexData.missingDescFiles.length}\``,
    ''
  ]

  for (const b of DOMAIN_BUCKETS) {
    const items = indexData.buckets[b.key]
    if (!items || items.length === 0) continue
    lines.push(`## ${b.label}`, '')
    lines.push('| 文件路径 | 业务职责 (`@desc`) | 关联编号 (`REQ/AC/API/COMP`) | 核心导出 / 模型 | 指纹前 12 位 |')
    lines.push('|---|---|---|---|---|')
    for (const item of items) {
      const idBadges = [
        ...item.tags.reqs,
        ...item.tags.acs,
        ...item.tags.apis,
        ...item.tags.comps
      ]
      const tagStr = idBadges.length > 0 ? idBadges.map((id) => `\`${id}\``).join(' ') : '-'
      const symStr = item.symbols.length > 0 ? item.symbols.map((s) => `\`${s}\``).join(', ') : '-'
      lines.push(`| \`${item.path}\` | ${item.desc} | ${tagStr} | ${symStr} | \`${item.sha256.slice(0, 12)}\` |`)
    }
    lines.push('')
  }

  if (indexData.missingDescFiles.length > 0) {
    lines.push('## 待补充 `@desc` 标注的文件', '')
    for (const f of indexData.missingDescFiles) {
      lines.push(`- \`${f}\` — 建议在文件前 10 行补写：\`// @desc <一句话中文职责> | @req REQ-xxx\``)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function runSelfCheck() {
  const sampleTs = [
    '// @desc 工单创建表单组件 | @comp COMP-001 | @req REQ-001 | @ac AC-001',
    'export function TicketForm() { return null }',
    'export const TICKET_MAX_LEN = 100'
  ].join('\n')
  const meta = extractFileMetadata('src/components/TicketForm.tsx', sampleTs)
  if (
    meta.desc !== '工单创建表单组件' ||
    !meta.tags.comps.includes('COMP-001') ||
    !meta.tags.reqs.includes('REQ-001') ||
    !meta.tags.acs.includes('AC-001') ||
    !meta.symbols.includes('TicketForm')
  ) {
    console.error('❌ build-index-tree.mjs metadata parser self-check failed:', JSON.stringify(meta))
    process.exit(1)
  }
  console.log('✅ build-index-tree.mjs self-check passed (Node ' + process.version + ', metadata/symbol/SHA-256 parser ready).')
}

function runWrite() {
  const data = buildIndexData(cwd)
  const md = renderMarkdown(data)
  fs.writeFileSync(path.join(cwd, 'PROJECT_INDEX_TREE.md'), md, 'utf8')
  const docsDir = path.join(cwd, 'docs')
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true })
  fs.writeFileSync(path.join(docsDir, 'index-tree.json'), JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`✅ 已生成 PROJECT_INDEX_TREE.md 与 docs/index-tree.json（共索引 ${data.totalIndexedFiles} 个文件，指纹 ${data.treeFingerprintSha256.slice(0, 12)}）。`)
  if (data.missingDescFiles.length > 0) {
    console.log(`⚠️ 提示：有 ${data.missingDescFiles.length} 个源码文件尚未写 // @desc 注释，可在下次改动时补齐。`)
  }
}

function runCheck() {
  const jsonPath = path.join(cwd, 'docs', 'index-tree.json')
  const mdPath = path.join(cwd, 'PROJECT_INDEX_TREE.md')
  const current = buildIndexData(cwd)

  if (current.totalIndexedFiles === 0) {
    console.log('ℹ️ 当前目录暂无可索引业务文件，跳过索引树新鲜度检查。')
    return
  }

  if (!fs.existsSync(jsonPath) || !fs.existsSync(mdPath)) {
    console.error('❌ [Index Tree] 缺少 PROJECT_INDEX_TREE.md 或 docs/index-tree.json（违反 STD-GOV-05）。')
    console.error('   请运行刷新命令：node scripts/build-index-tree.mjs --write')
    process.exit(1)
  }

  const expectedJson = JSON.stringify(current, null, 2) + '\n'
  const expectedMd = renderMarkdown(current)
  const actualJson = fs.readFileSync(jsonPath, 'utf8').replace(/\r\n/g, '\n')
  const actualMd = fs.readFileSync(mdPath, 'utf8').replace(/\r\n/g, '\n')

  if (actualJson !== expectedJson || actualMd !== expectedMd) {
    console.error('❌ [Index Tree] 检测到项目文件已变更或索引文件被篡改，与最新扫描结果不一致！')
    console.error('   请运行刷新命令：node scripts/build-index-tree.mjs --write')
    process.exit(1)
  }

  console.log(`✅ [Index Tree] 索引树新鲜度与内容校验通过（${current.totalIndexedFiles} 个文件，指纹 ${current.treeFingerprintSha256.slice(0, 12)} 一致）。`)
}

// 仅作为主脚本执行时解析 CLI 参数（使用 fileURLToPath 兼容中文/空格路径与 Windows）
const entryArg = process.argv[1]
const isMain =
  entryArg !== undefined &&
  path.resolve(entryArg) === path.resolve(fileURLToPath(import.meta.url))
if (isMain) {
  if (args.includes('--self-check')) {
    runSelfCheck()
  } else if (args.includes('--check')) {
    runCheck()
  } else if (args.includes('--write') || args.length === 0) {
    runWrite()
  } else {
    console.log('用法: node build-index-tree.mjs [--self-check | --write | --check]')
  }
}
