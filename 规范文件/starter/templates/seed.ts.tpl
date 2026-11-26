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
import { hashPassword } from '../server/middleware/auth-rbac'
import { TEST_ACCOUNT_MAP, TEST_ACCOUNTS } from './test-accounts'

export { TEST_ACCOUNT_MAP, TEST_ACCOUNTS }

export async function seedTestAccounts(): Promise<void> {
  // 强制安全熔断：严禁在生产环境运行合成测试种子脚本
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ [Seed Guard] 检测到 NODE_ENV=production，已强制中止测试种子写入以防污染生产数据！')
    process.exit(1)
  }

  const prisma = new PrismaClient()
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

const isMain =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isMain) {
  seedTestAccounts().catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
}
