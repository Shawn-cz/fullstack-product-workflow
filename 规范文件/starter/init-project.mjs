#!/usr/bin/env node
/**
 * 软件产品设计与全栈交付工作流 v1.0.0 — 黄金技术栈一键初始化脚手架脚本
 * 对应规则：STD-ARC-09（React+Preline+PostgreSQL 黄金栈）、STD-GOV-05（索引树）、STD-SEC-05（RBAC）、STD-QA-13/14
 *
 * 用法：
 *   node init-project.mjs --self-check             # 工作流内校验所有源模板文件齐全
 *   node init-project.mjs --target <dir>           # 初始化目标项目（默认跳过已存在文件）
 *   node init-project.mjs --target <dir> --force   # 强制覆盖脚手架文件
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const specDir = path.resolve(scriptDir, '..')

const FILE_MAPPINGS = [
  // Starter 配置与黄金栈代码底座
  { src: path.join(scriptDir, 'templates', 'package.json.tpl'), dest: 'package.json' },
  { src: path.join(scriptDir, 'templates', 'tsconfig.json.tpl'), dest: 'tsconfig.json' },
  { src: path.join(scriptDir, 'templates', 'vite.config.ts.tpl'), dest: 'vite.config.ts' },
  { src: path.join(scriptDir, 'templates', 'eslint.config.mjs.tpl'), dest: 'eslint.config.mjs' },
  { src: path.join(scriptDir, 'templates', '.env.example.tpl'), dest: '.env.example' },
  { src: path.join(scriptDir, 'templates', 'schema.prisma.tpl'), dest: 'prisma/schema.prisma' },
  { src: path.join(scriptDir, 'templates', 'seed.ts.tpl'), dest: 'prisma/seed.ts' },
  { src: path.join(scriptDir, 'templates', 'usePrelineInit.ts.tpl'), dest: 'src/hooks/usePrelineInit.ts' },
  { src: path.join(scriptDir, 'templates', 'auth-rbac.ts.tpl'), dest: 'server/middleware/auth-rbac.ts' },
  // 通用契约包（前后端同构分离）
  { src: path.join(specDir, 'contracts', 'base-contract.schema.ts'), dest: 'shared/contracts/base-contract.schema.ts' },
  { src: path.join(specDir, 'contracts', 'fingerprint.server.ts'), dest: 'shared/contracts/fingerprint.server.ts' },
  { src: path.join(specDir, 'contracts', 'openapi-baseline.yaml'), dest: 'shared/contracts/openapi-baseline.yaml' },
  // CI 四道门禁、索引树生成器与 PostgreSQL 16 同构容器
  { src: path.join(specDir, 'ci', 'docker-compose.postgres.yml'), dest: 'docker-compose.postgres.yml' },
  { src: path.join(specDir, 'ci', 'github-actions-ci.yml'), dest: '.github/workflows/ci.yml' },
  { src: path.join(specDir, 'ci', 'verify-gates.mjs'), dest: 'scripts/verify-gates.mjs' },
  { src: path.join(specDir, 'ci', 'build-index-tree.mjs'), dest: 'scripts/build-index-tree.mjs' }
]

function runSelfCheck() {
  const missing = FILE_MAPPINGS.filter((m) => !fs.existsSync(m.src)).map((m) => m.src)
  if (missing.length > 0) {
    console.error('❌ init-project.mjs self-check failed, missing templates:')
    missing.forEach((p) => console.error('   - ' + p))
    process.exit(1)
  }
  // 校验同构契约文件绝对不包含 node:crypto 的 import/require（防止 React Vite 浏览器构建报错）
  const isoContract = fs.readFileSync(path.join(specDir, 'contracts', 'base-contract.schema.ts'), 'utf8')
  if (/(?:from|require\s*\()\s*['"](?:node:)?crypto['"]/.test(isoContract)) {
    console.error('❌ base-contract.schema.ts 禁止导入 node:crypto（须隔离至 fingerprint.server.ts）！')
    process.exit(1)
  }
  console.log(`✅ init-project.mjs self-check passed (${FILE_MAPPINGS.length} starter assets verified, isomorphic contract clean).`)
}

function runInit(targetDir, force) {
  const absTarget = path.resolve(targetDir)
  if (!fs.existsSync(absTarget)) {
    fs.mkdirSync(absTarget, { recursive: true })
  }

  let created = 0
  let skipped = 0
  for (const m of FILE_MAPPINGS) {
    const destPath = path.join(absTarget, m.dest)
    if (fs.existsSync(destPath) && !force) {
      skipped++
      continue
    }
    fs.mkdirSync(path.dirname(destPath), { recursive: true })
    fs.copyFileSync(m.src, destPath)
    created++
  }

  // 补齐 .gitignore（确保 .env / node_modules / dist 不入库）
  const gitignorePath = path.join(absTarget, '.gitignore')
  if (!fs.existsSync(gitignorePath) || force) {
    fs.writeFileSync(
      gitignorePath,
      ['node_modules/', 'dist/', '.env', '.env.local', '.env.production', 'coverage/', '.DS_Store', 'Thumbs.db', ''].join('\n'),
      'utf8'
    )
    created++
  }

  // 创建标准空目录占位
  for (const dir of ['docs/evidence', 'src/pages', 'src/components', 'tests']) {
    fs.mkdirSync(path.join(absTarget, dir), { recursive: true })
  }

  console.log(`✅ 黄金技术栈项目底座初始化完成：目标=${absTarget}（新建/更新 ${created} 个文件，跳过已存在 ${skipped} 个文件）。`)
  console.log('下一步：')
  console.log('  1. 复制 .env.example 为 .env')
  console.log('  2. npm run db:up && npm install && npm run db:migrate && npm run db:seed')
  console.log('  3. npm run index:build && npm run gates')
}

if (args.includes('--self-check')) {
  runSelfCheck()
} else {
  const targetIdx = args.indexOf('--target')
  const targetDir = targetIdx !== -1 && args[targetIdx + 1] ? args[targetIdx + 1] : '.'
  const force = args.includes('--force')
  runInit(targetDir, force)
}
