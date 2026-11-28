// @desc Playwright 自动化双账号越权与端到端视觉验收配置 (STD-QA-12 / STD-QA-13)
import { defineConfig } from '@playwright/test'

const apiPort = process.env.PORT || '3001'
const webPort = process.env.FRONTEND_PORT || '5173'
const baseURL = process.env.E2E_BASE_URL || `http://127.0.0.1:${webPort}`
const healthURL = process.env.E2E_HEALTH_URL || `http://127.0.0.1:${apiPort}/readyz`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'docs/evidence/playwright-report', open: 'never' }]
  ],
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  // 自动拉起后端（等待 /readyz 就绪）与前端 Vite 服务
  webServer: [
    {
      command: process.env.E2E_SERVER_CMD || 'npm run dev:server',
      url: healthURL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    },
    {
      command: process.env.E2E_WEB_CMD || 'npm run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    }
  ]
})
