#!/usr/bin/env node
/**
 * 软件产品设计与全栈交付工作流 v1.2.0 — 黄金技术栈全生命周期一键初始化脚手架脚本
 * 对应规则：STD-ARC-09、STD-GOV-05、STD-FE-07、STD-CODE-12、STD-SEC-05、STD-QA-13/14、STD-OPS-07/08
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
  // Starter 配置、Brand Theme Token 与黄金栈代码底座
  { src: path.join(scriptDir, 'templates', 'package.json.tpl'), dest: 'package.json' },
  { src: path.join(scriptDir, 'templates', 'tsconfig.json.tpl'), dest: 'tsconfig.json' },
  { src: path.join(scriptDir, 'templates', 'vite.config.ts.tpl'), dest: 'vite.config.ts' },
  { src: path.join(scriptDir, 'templates', 'eslint.config.mjs.tpl'), dest: 'eslint.config.mjs' },
  { src: path.join(scriptDir, 'templates', '.env.example.tpl'), dest: '.env.example' },
  { src: path.join(scriptDir, 'templates', 'schema.prisma.tpl'), dest: 'prisma/schema.prisma' },
  { src: path.join(scriptDir, 'templates', 'test-accounts.ts.tpl'), dest: 'prisma/test-accounts.ts' },
  { src: path.join(scriptDir, 'templates', 'seed.ts.tpl'), dest: 'prisma/seed.ts' },
  { src: path.join(scriptDir, 'templates', 'playwright.config.ts.tpl'), dest: 'playwright.config.ts' },
  { src: path.join(scriptDir, 'templates', 'auth-contexts.ts.tpl'), dest: 'tests/e2e/fixtures/auth-contexts.ts' },
  { src: path.join(scriptDir, 'templates', 'theme.css.tpl'), dest: 'src/styles/theme.css' },
  { src: path.join(scriptDir, 'templates', 'usePrelineInit.ts.tpl'), dest: 'src/hooks/usePrelineInit.ts' },
  { src: path.join(scriptDir, 'templates', 'auth-rbac.ts.tpl'), dest: 'server/middleware/auth-rbac.ts' },
  { src: path.join(scriptDir, 'templates', 'logger-trace.ts.tpl'), dest: 'server/middleware/logger-trace.ts' },
  // 通用契约包（前后端同构分离）
  { src: path.join(specDir, 'contracts', 'base-contract.schema.ts'), dest: 'shared/contracts/base-contract.schema.ts' },
  { src: path.join(specDir, 'contracts', 'fingerprint.server.ts'), dest: 'shared/contracts/fingerprint.server.ts' },
  { src: path.join(specDir, 'contracts', 'openapi-baseline.yaml'), dest: 'shared/contracts/openapi-baseline.yaml' },
  // CI 四道门禁、索引树生成器、Pre-commit Hook、PR 模板与本地 PostgreSQL 16 容器
  { src: path.join(specDir, 'ci', 'docker-compose.postgres.yml'), dest: 'docker-compose.postgres.yml' },
  { src: path.join(specDir, 'ci', 'github-actions-ci.yml'), dest: '.github/workflows/ci.yml' },
  { src: path.join(specDir, 'ci', 'pull_request_template.md'), dest: '.github/pull_request_template.md' },
  { src: path.join(specDir, 'ci', 'pre-commit.hook'), dest: '.githooks/pre-commit' },
  { src: path.join(specDir, 'ci', 'verify-gates.mjs'), dest: 'scripts/verify-gates.mjs' },
  { src: path.join(specDir, 'ci', 'build-index-tree.mjs'), dest: 'scripts/build-index-tree.mjs' },
  // S8 生产容器部署、自动 HTTPS、双探针与数据库备份恢复脚本
  { src: path.join(specDir, 'deploy', 'Dockerfile'), dest: 'Dockerfile' },
  { src: path.join(specDir, 'deploy', 'docker-compose.prod.yml'), dest: 'docker-compose.prod.yml' },
  { src: path.join(specDir, 'deploy', 'Caddyfile'), dest: 'Caddyfile' },
  { src: path.join(specDir, 'deploy', 'health-probes.ts.tpl'), dest: 'server/routes/health-probes.ts' },
  { src: path.join(specDir, 'deploy', 'backup-postgres.mjs'), dest: 'scripts/backup-postgres.mjs' }
]

function runSelfCheck() {
  const missing = FILE_MAPPINGS.filter((m) => !fs.existsSync(m.src)).map((m) => m.src)
  const examplePath = path.join(scriptDir, 'examples', 'rbac-isolation.spec.ts.example')
  if (!fs.existsSync(examplePath)) {
    missing.push(examplePath)
  }
  if (missing.length > 0) {
    console.error('❌ init-project.mjs self-check failed, missing templates:')
    missing.forEach((p) => console.error('   - ' + p))
    process.exit(1)
  }
  const isoContract = fs.readFileSync(path.join(specDir, 'contracts', 'base-contract.schema.ts'), 'utf8')
  if (/(?:from|require\s*\()\s*['"](?:node:)?crypto['"]/.test(isoContract)) {
    console.error('❌ base-contract.schema.ts 禁止导入 node:crypto（须隔离至 fingerprint.server.ts）！')
    process.exit(1)
  }
  console.log(`✅ init-project.mjs self-check passed (${FILE_MAPPINGS.length} full-lifecycle starter assets + S6 RBAC E2E example verified, isomorphic contract clean).`)
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
    if (m.dest === '.githooks/pre-commit') {
      try {
        fs.chmodSync(destPath, 0o755)
      } catch {
        // Windows NTFS ignores POSIX chmod safely
      }
    }
    created++
  }

  const gitignorePath = path.join(absTarget, '.gitignore')
  if (!fs.existsSync(gitignorePath) || force) {
    fs.writeFileSync(
      gitignorePath,
      ['node_modules/', 'dist/', 'backups/', 'playwright-report/', 'docs/evidence/playwright-report/', 'test-results/', '.env', '.env.local', '.env.production', 'coverage/', '.DS_Store', 'Thumbs.db', ''].join('\n'),
      'utf8'
    )
    created++
  }

  for (const dir of ['docs/evidence', 'src/pages', 'src/components', 'tests', 'tests/e2e/fixtures']) {
    fs.mkdirSync(path.join(absTarget, dir), { recursive: true })
  }

  console.log(`✅ 全生命周期黄金栈项目底座初始化完成：目标=${absTarget}（新建/更新 ${created} 个文件，跳过已存在 ${skipped} 个文件）。`)
  console.log('下一步：')
  console.log('  1. 复制 .env.example 为 .env')
  console.log('  2. npm run db:up && npm install && npm run hooks:install && npm run db:migrate && npm run db:seed')
  console.log('  3. npm run index:build && npm run gates（S6 补入 tests/e2e/*.spec.ts 后可运行 npm run test:e2e:fresh）')
}

if (args.includes('--self-check')) {
  runSelfCheck()
} else {
  const targetIdx = args.indexOf('--target')
  const targetDir = targetIdx !== -1 && args[targetIdx + 1] ? args[targetIdx + 1] : '.'
  const force = args.includes('--force')
  runInit(targetDir, force)
}
