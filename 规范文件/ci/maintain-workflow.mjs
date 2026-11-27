#!/usr/bin/env node
/**
 * 软件产品设计与全栈交付工作流 v1.3.1 — 工作流母版仓库维护、校验与发版清单脚本
 *
 * 用法：
 *   node 规范文件/ci/maintain-workflow.mjs --split-templates   # 从 02_模板包.md 重新拆分 T01~T13 单文件模板
 *   node 规范文件/ci/maintain-workflow.mjs --check             # 检查脚本语法、CRLF/LF、Git 可见断链、体积上限与计数
 *   node 规范文件/ci/maintain-workflow.mjs --pack              # 先执行 --check，再生成本地打包用 文档检查结果.json 与 交付文件清单.json
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WORKFLOW_VERSION = '1.3.1'
const BASELINE_MANIFEST = '../历史归档_勿喂给AI/2026-11-14_至_2026-11-26/v1.3.0-manifest.json'
const MAX_ALWAYS_ON_BYTES = 5120 // ARCHITECTURE.md 约定常驻规则 < 5KB

const args = process.argv.slice(2)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const specDir = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(specDir, '..')

function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function walkFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkFiles(full, results)
    } else {
      results.push(full)
    }
  }
  return results
}

function getGitIgnoredSet(absPaths) {
  if (!fs.existsSync(path.join(repoRoot, '.git')) || absPaths.length === 0) return new Set()
  const uniqueRels = [...new Set(absPaths.map((p) => path.relative(repoRoot, p).replace(/\\/g, '/')))]
  const res = spawnSync('git', ['check-ignore', '--stdin'], {
    cwd: repoRoot,
    input: uniqueRels.join('\n') + '\n',
    encoding: 'utf8'
  })
  return new Set(
    (res.stdout || '')
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^"|"$/g, ''))
      .filter(Boolean)
  )
}

function splitTemplates() {
  const templatesDir = path.join(specDir, 'templates')
  const existingMap = new Map()
  for (const name of fs.readdirSync(templatesDir)) {
    const m = name.match(/^(T\d{2})_.*\.md$/)
    if (m) existingMap.set(m[1], path.join(templatesDir, name))
  }

  const packText = fs.readFileSync(path.join(specDir, '02_模板包.md'), 'utf8')
  const lines = packText.split(/\r?\n/)
  const starts = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^## (T\d{2})\s+(.+)$/)
    if (m) starts.push({ id: m[1], line: i })
  }

  if (starts.length !== 13) {
    throw new Error(`Expected 13 template sections in 02_模板包.md, found ${starts.length}`)
  }

  for (let s = 0; s < starts.length; s++) {
    const { id, line: startIdx } = starts[s]
    const endIdx = s + 1 < starts.length ? starts[s + 1].line - 1 : lines.length - 1
    let chunk = lines.slice(startIdx, endIdx + 1).join('\n').trimEnd()
    chunk = chunk.replace(/\]\((0\d_[^)#]+\.md(?:#[^)]*)?)\)/g, '](../$1)')
    chunk = chunk.replace(/\]\(((?:ci|contracts|starter|deploy)\/[^)]+)\)/g, '](../$1)')
    chunk = chunk.replace(/^## /, '# ')
    const header = `> 独立按需加载模板（源自 [02_模板包.md](../02_模板包.md)｜工作流 v${WORKFLOW_VERSION}）。日常执行仅加载本阶段模板以节省上下文。\n\n`
    const targetPath = existingMap.get(id)
    if (!targetPath) throw new Error(`Missing template file mapping for ${id}`)
    fs.writeFileSync(targetPath, header + chunk + '\n', 'utf8')
  }
  console.log(`✅ 已从 02_模板包.md 重新拆分 ${starts.length} 份独立模板（v${WORKFLOW_VERSION}）。`)
}

function runCheck() {
  const errors = []

  // 1. Syntax check all .mjs scripts + check pre-commit.hook is LF & valid Node script
  const mjsFiles = walkFiles(specDir).filter((f) => f.endsWith('.mjs'))
  for (const mjs of mjsFiles) {
    const res = spawnSync(process.execPath, ['--check', mjs], { stdio: 'pipe', encoding: 'utf8' })
    if (res.status !== 0) {
      errors.push(`语法检查失败: ${path.relative(repoRoot, mjs)} -> ${res.stderr}`)
    }
  }
  const hookPath = path.join(specDir, 'ci', 'pre-commit.hook')
  if (fs.existsSync(hookPath)) {
    const hookRaw = fs.readFileSync(hookPath, 'utf8')
    if (hookRaw.includes('\r\n')) {
      errors.push('规范文件/ci/pre-commit.hook 包含 CRLF，必须为 LF')
    }
    if (!hookRaw.startsWith('#!/usr/bin/env node')) {
      errors.push('规范文件/ci/pre-commit.hook 必须使用跨平台 #!/usr/bin/env node')
    }
  }

  // 2. Run verify-gates.mjs --self-check
  const vgRes = spawnSync(process.execPath, [path.join(specDir, 'ci', 'verify-gates.mjs'), '--self-check'], {
    stdio: 'inherit'
  })
  if (vgRes.status !== 0) {
    errors.push('verify-gates.mjs --self-check 未通过')
  }

  // 3. Verify INDEX_TREE.md line numbers against 01_规则库.md
  const ruleLines = fs.readFileSync(path.join(specDir, '01_规则库.md'), 'utf8').split(/\r?\n/)
  const sectionStarts = new Map()
  for (let i = 0; i < ruleLines.length; i++) {
    const m = ruleLines[i].match(/^## ([A-Z])\.\s/)
    if (m) sectionStarts.set(m[1], i + 1)
  }
  const indexText = fs.readFileSync(path.join(specDir, 'INDEX_TREE.md'), 'utf8')
  for (const line of indexText.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([A-Z])\s*\|[^|]+\|\s*\[L(\d+)-L(\d+)\]\(01_规则库\.md#L\d+-L\d+\)\s*\|/)
    if (m) {
      const sec = m[1]
      const listedStart = Number(m[2])
      const actualStart = sectionStarts.get(sec)
      if (actualStart !== listedStart) {
        errors.push(`INDEX_TREE.md 节 ${sec} 起始行号漂移：索引写 L${listedStart}，实际为 L${actualStart}`)
      }
    }
  }

  // 4. Verify 0 broken relative Markdown links AND prevent tracked .md linking to gitignored targets (single batch git check-ignore)
  const mdFiles = walkFiles(repoRoot).filter((f) => {
    if (!f.endsWith('.md')) return false
    const rel = path.relative(repoRoot, f).replace(/\\/g, '/')
    return !rel.startsWith('历史归档_勿喂给AI/')
  })
  const linkChecks = []
  const allPathsToCheckIgnore = [...mdFiles]
  for (const md of mdFiles) {
    const relMd = path.relative(repoRoot, md).replace(/\\/g, '/')
    const raw = fs.readFileSync(md, 'utf8')
    const stripped = raw.replace(/```[\s\S]*?```/g, '')
    const linkRegex = /\[[^\]]*\]\(([^)]+)\)/g
    let lm
    while ((lm = linkRegex.exec(stripped)) !== null) {
      const href = lm[1].trim()
      if (/^(https?:|mailto:|#)/i.test(href)) continue
      const targetPart = href.split('#')[0]
      if (!targetPart) continue
      const resolved = path.resolve(path.dirname(md), targetPart)
      if (!fs.existsSync(resolved)) {
        errors.push(`断链: ${relMd} -> ${href}`)
      } else {
        linkChecks.push({ md, relMd, href, resolved })
        allPathsToCheckIgnore.push(resolved)
      }
    }
  }
  const ignoredSet = getGitIgnoredSet(allPathsToCheckIgnore)
  for (const lc of linkChecks) {
    const relSrc = path.relative(repoRoot, lc.md).replace(/\\/g, '/')
    const relDst = path.relative(repoRoot, lc.resolved).replace(/\\/g, '/')
    if (!ignoredSet.has(relSrc) && ignoredSet.has(relDst)) {
      errors.push(`跨克隆断链（链接了 .gitignore 忽略目标）: ${lc.relMd} -> ${lc.href}`)
    }
  }

  // 5. README.md === 开始使用.md
  const readmeHash = sha256File(path.join(repoRoot, 'README.md'))
  const startHash = sha256File(path.join(repoRoot, '开始使用.md'))
  if (readmeHash !== startHash) {
    errors.push('README.md 与 开始使用.md 内容不一致')
  }

  // 6. Always-on rule size budget (< 5KB) & SKILL.md frontmatter + LF check
  const agentsBytes = fs.statSync(path.join(repoRoot, 'AGENTS.md')).size
  const skillPath = path.join(repoRoot, '.agents', 'skills', 'fullstack-product-delivery', 'SKILL.md')
  const skillBytes = fs.statSync(skillPath).size
  const skillRaw = fs.readFileSync(skillPath, 'utf8')
  if (skillRaw.includes('\r')) {
    errors.push('SKILL.md 包含 CR/CRLF 换行符，必须统一为 LF')
  }
  const fmMatch = skillRaw.match(/^---\n([\s\S]*?)\n---\n/)
  if (!fmMatch) {
    errors.push('SKILL.md 缺少合法的 YAML frontmatter (--- ... ---)')
  } else {
    const fmBody = fmMatch[1]
    if (!/^name:\s*\S+/m.test(fmBody) || !/^description:\s*\S+/m.test(fmBody)) {
      errors.push('SKILL.md YAML frontmatter 必须包含 name 与 description 字段')
    }
  }
  if (agentsBytes > MAX_ALWAYS_ON_BYTES) {
    errors.push(`AGENTS.md 体积超出 5KB 上限：${agentsBytes} bytes`)
  }
  if (skillBytes > MAX_ALWAYS_ON_BYTES) {
    errors.push(`SKILL.md 体积超出 5KB 上限：${skillBytes} bytes`)
  }

  // 7. Exact structural counts
  const ruleText = fs.readFileSync(path.join(specDir, '01_规则库.md'), 'utf8')
  const ruleIds = [...ruleText.matchAll(/^\|\s*(STD-[A-Z0-9]+-\d+)\s*\|/gm)].map((m) => m[1])
  const uniqueRules = new Set(ruleIds)
  const mobileRules = [...uniqueRules].filter((r) => r.startsWith('STD-MOB-'))
  const srcText = fs.readFileSync(path.join(specDir, '05_来源与更新机制.md'), 'utf8')
  const uniqueSources = new Set([...srcText.matchAll(/^\|\s*(SRC-\d+)\s*\|/gm)].map((m) => m[1]))

  const counts = {
    markdown_files: fs.readdirSync(specDir).filter((n) => n.endsWith('.md')).length,
    starter_files: walkFiles(path.join(specDir, 'starter')).length,
    standalone_template_files: fs.readdirSync(path.join(specDir, 'templates')).filter((n) => /^T\d{2}_.*\.md$/.test(n)).length,
    contract_files: walkFiles(path.join(specDir, 'contracts')).length,
    ci_files: walkFiles(path.join(specDir, 'ci')).length,
    deploy_files: walkFiles(path.join(specDir, 'deploy')).length,
    skill_and_agent_files: walkFiles(path.join(repoRoot, '.agents', 'skills')).length + 1,
    stages: 10,
    stage_task_objectives: 10,
    rules: ruleIds.length,
    unique_rule_ids: uniqueRules.size,
    templates: 13,
    sources: uniqueSources.size,
    quality_gates: 4,
    mobile_rules: mobileRules.length
  }

  if (uniqueRules.size !== ruleIds.length) {
    errors.push(`01_规则库.md 存在重复规则编号: total=${ruleIds.length}, unique=${uniqueRules.size}`)
  }
  if (counts.standalone_template_files !== 13) {
    errors.push(`独立模板数异常: ${counts.standalone_template_files}`)
  }

  if (errors.length > 0) {
    console.error('❌ [maintain-workflow] 检查未通过：')
    errors.forEach((e) => console.error('   - ' + e))
    process.exit(1)
  }

  console.log(
    `✅ [maintain-workflow] 全部校验通过：${mjsFiles.length} 个脚本语法 OK，${mdFiles.length} 份 Git 活动 Markdown 0 断链，` +
      `AGENTS.md=${(agentsBytes / 1024).toFixed(1)}KB，SKILL.md=${(skillBytes / 1024).toFixed(1)}KB，` +
      `规则=${counts.unique_rule_ids}（移动=${counts.mobile_rules}），来源=${counts.sources}。`
  )
  return counts
}

function runPack() {
  const counts = runCheck()
  const specRootMd = fs
    .readdirSync(specDir)
    .filter((n) => n.endsWith('.md'))
    .sort()
  const docCheck = {
    date: new Date().toISOString().slice(0, 10),
    workflow_version: WORKFLOW_VERSION,
    scope: '跨系统 LF 归一化、.dockerignore、预置 /api/auth/* 路由与新克隆自检闭环版',
    status: 'passed',
    counts,
    errors: [],
    historical_documents: [
      '../历史归档_勿喂给AI/审计报告_v0.6.md',
      '../历史归档_勿喂给AI/审计报告_v0.8.md',
      '../历史归档_勿喂给AI/审计报告_v0.9.md',
      '../历史归档_勿喂给AI/审计报告_v1.0.md'
    ],
    baseline_manifest: BASELINE_MANIFEST,
    files: specRootMd.map((name) => ({
      path: name,
      sha256: sha256File(path.join(specDir, name))
    })),
    packaging_note: '本文件与顶层 交付文件清单.json 已加入 .gitignore，仅在本地执行 --pack / 打包 ZIP 时生成。'
  }
  fs.writeFileSync(path.join(specDir, '文档检查结果.json'), JSON.stringify(docCheck, null, 2) + '\n', 'utf8')

  const activeFiles = walkFiles(repoRoot)
    .filter((f) => {
      const rel = path.relative(repoRoot, f).replace(/\\/g, '/')
      return (
        !rel.startsWith('历史归档_勿喂给AI/') &&
        rel !== '交付文件清单.json' &&
        rel !== '规范文件/文档检查结果.json'
      )
    })
    .sort()

  const deliveryManifest = {
    version: WORKFLOW_VERSION,
    generated_at: new Date().toISOString(),
    root: `软件产品全栈交付工作流_v${WORKFLOW_VERSION}`,
    file_count: activeFiles.length,
    excluded: ['.git/', '历史归档_勿喂给AI/', '交付文件清单.json', '规范文件/文档检查结果.json'],
    files: activeFiles.map((f) => ({
      path: path.relative(repoRoot, f).replace(/\\/g, '/'),
      size: fs.statSync(f).size,
      sha256: sha256File(f)
    }))
  }
  fs.writeFileSync(path.join(repoRoot, '交付文件清单.json'), JSON.stringify(deliveryManifest, null, 2) + '\n', 'utf8')
  console.log(`✅ [maintain-workflow] 已生成本地打包校验清单：规范文件/文档检查结果.json 与 交付文件清单.json（共 ${activeFiles.length} 个活动文件）。`)
}

if (args.includes('--split-templates')) {
  splitTemplates()
} else if (args.includes('--pack')) {
  runPack()
} else if (args.includes('--check')) {
  runCheck()
} else {
  console.log('用法: node maintain-workflow.mjs [--split-templates | --check | --pack]')
}
