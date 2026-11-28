// @desc 合成测试种子账号工厂（供自动化 Playwright 越权验收与人工黑盒验真，含生产环境熔断保护）
/**
 * 对应规则：STD-QA-12（黑盒与自动化越权验真）、STD-QA-14（测试种子与一键重置）
 *
 * 运行命令：
 *   npm run db:seed    # 幂等写入 4 个固定合成测试账号
 *   npm run db:reset   # 一键清库、重跑迁移并灌入种子账号
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { getServerEnv, loadDotEnvIfNeeded, resolveDatabaseUrl } from '../server/config/env'
import { hashPassword } from '../server/middleware/auth-rbac'
import { TEST_ACCOUNT_MAP, TEST_ACCOUNTS } from './test-accounts'

export { TEST_ACCOUNT_MAP, TEST_ACCOUNTS }

export async function seedTestAccounts(): Promise<void> {
  loadDotEnvIfNeeded()
  // 强制安全熔断：严禁在生产环境或非测试/开发库运行合成测试种子脚本
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ [Seed Guard] 检测到 NODE_ENV=production，已强制中止测试种子写入以防污染生产数据！')
    process.exit(1)
  }

  const dbUrl = resolveDatabaseUrl(getServerEnv()) || process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('❌ [Seed Guard] 缺少 DATABASE_URL，已中止测试种子写入！')
    process.exit(1)
  }
  let dbName = ''
  try {
    dbName = new URL(dbUrl).pathname.replace(/^\/+/, '').split('/')[0] || ''
  } catch {
    console.error('❌ [Seed Guard] DATABASE_URL 格式无效，已中止测试种子写入！')
    process.exit(1)
  }
  if (/prod|production/i.test(dbName)) {
    console.error(`❌ [Seed Guard] 目标库名 "${dbName}" 包含 prod/production，严禁写入合成测试账号！`)
    process.exit(1)
  }
  if (process.env.ALLOW_ANY_SEED_DB !== '1' && !/(?:^|[_-])(?:dev|test|local)(?:$|[_-])/i.test(dbName)) {
    console.error(`❌ [Seed Guard] 目标库名 "${dbName}" 未包含 dev/test/local 词边界标识，已中止种子写入！`)
    process.exit(1)
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } })
  try {
    for (const acc of TEST_ACCOUNTS) {
      await prisma.user.upsert({
        where: { email: acc.email },
        update: { displayName: acc.displayName, role: acc.role, isActive: true },
        create: {
          email: acc.email,
          displayName: acc.displayName,
          role: acc.role,
          passwordHash: hashPassword(acc.password),
          isActive: true
        }
      })
    }
    console.log('✅ 已幂等写入 4 个越权验真合成测试账号（供 Playwright 自动验收与开发/测试环境验证）：')
    for (const acc of TEST_ACCOUNTS) {
      console.log(`   - [${acc.role}] ${acc.email} / ${acc.password}`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

const entryArg = process.argv[1]
const isMain =
  entryArg !== undefined &&
  path.resolve(entryArg) === path.resolve(fileURLToPath(import.meta.url))

if (isMain) {
  seedTestAccounts().catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
}
