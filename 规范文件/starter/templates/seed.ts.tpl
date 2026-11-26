// @desc 合成测试种子账号工厂（供零经验成员双无痕窗口黑盒验真，含生产环境熔断保护）
/**
 * 对应规则：STD-QA-12（黑盒越权验真）、STD-QA-14（测试种子与一键重置）
 *
 * 运行命令：
 *   npm run db:seed    # 幂等写入 4 个固定合成测试账号
 *   npm run db:reset   # 一键清库、重跑迁移并灌入种子账号
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../server/middleware/auth-rbac'

// 强制安全熔断：严禁在生产环境运行合成测试种子脚本
if (process.env.NODE_ENV === 'production') {
  console.error('❌ [Seed Guard] 检测到 NODE_ENV=production，已强制中止测试种子写入以防污染生产数据！')
  process.exit(1)
}

const prisma = new PrismaClient()

export const TEST_ACCOUNTS = [
  { email: 'admin@example.test', displayName: '测试管理员', role: 'ADMIN' as const, password: 'TestOnly_Admin!2026' },
  { email: 'handler@example.test', displayName: '测试处理员', role: 'HANDLER' as const, password: 'TestOnly_Handler!2026' },
  { email: 'member_a@example.test', displayName: '测试成员A', role: 'MEMBER' as const, password: 'TestOnly_MemberA!2026' },
  { email: 'member_b@example.test', displayName: '测试成员B', role: 'MEMBER' as const, password: 'TestOnly_MemberB!2026' }
]

async function main() {
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
  console.log('✅ 已幂等写入 4 个黑盒验真合成测试账号（仅供开发/测试环境双无痕窗口越权测试）：')
  for (const acc of TEST_ACCOUNTS) {
    console.log(`   - [${acc.role}] ${acc.email} / ${acc.password}`)
  }
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
