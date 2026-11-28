// @desc Vite + React + Tailwind CSS 构建、本地代理与 Vitest 隔离配置
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

const frontendPort = Number(process.env.FRONTEND_PORT || 5173)
const apiPort = Number(process.env.PORT || 3001)
const apiTarget = `http://127.0.0.1:${apiPort}`

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@contracts': path.resolve(__dirname, 'shared/contracts')
    }
  },
  server: {
    port: frontendPort,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true
      },
      '/healthz': {
        target: apiTarget,
        changeOrigin: true
      },
      '/readyz': {
        target: apiTarget,
        changeOrigin: true
      }
    }
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-server/**', 'tests/e2e/**']
  }
})
