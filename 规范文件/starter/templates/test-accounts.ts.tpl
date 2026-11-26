// @desc 合成测试账号纯数据清单（供 seed.ts 与 Playwright 多角色越权测试共享，无副作用）
/**
 * 对应规则：STD-QA-12（黑盒与自动化越权验收）、STD-QA-14（测试种子单一真相源）
 * 说明：本文件只导出纯账号常量，不连接数据库且无任何导入副作用。
 */

export type TestAccountRole = 'ADMIN' | 'HANDLER' | 'MEMBER_A' | 'MEMBER_B'

export interface TestAccountSeed {
  email: string
  displayName: string
  role: 'ADMIN' | 'HANDLER' | 'MEMBER'
  password: string
}

export const TEST_ACCOUNT_MAP: Record<TestAccountRole, TestAccountSeed> = {
  ADMIN: {
    email: 'admin@example.test',
    displayName: '测试管理员',
    role: 'ADMIN',
    password: 'TestOnly_Admin!2026'
  },
  HANDLER: {
    email: 'handler@example.test',
    displayName: '测试处理员',
    role: 'HANDLER',
    password: 'TestOnly_Handler!2026'
  },
  MEMBER_A: {
    email: 'member_a@example.test',
    displayName: '测试成员A',
    role: 'MEMBER',
    password: 'TestOnly_MemberA!2026'
  },
  MEMBER_B: {
    email: 'member_b@example.test',
    displayName: '测试成员B',
    role: 'MEMBER',
    password: 'TestOnly_MemberB!2026'
  }
}

export const TEST_ACCOUNTS: readonly TestAccountSeed[] = Object.values(TEST_ACCOUNT_MAP)
