// @desc 应用默认根组件（接入 Preline 路由初始化与 /healthz 连通性状态展示） | @comp COMP-APP
import { useEffect, useState } from 'react'
import { usePrelineInit } from './hooks/usePrelineInit'

type ProbeState = 'loading' | 'ok' | 'unavailable'

export default function App() {
  usePrelineInit('/')
  const [probeState, setProbeState] = useState<ProbeState>('loading')

  useEffect(() => {
    const controller = new AbortController()
    fetch('/healthz', { signal: controller.signal })
      .then((res) => {
        setProbeState(res.ok ? 'ok' : 'unavailable')
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setProbeState('unavailable')
        }
      })
    return () => {
      controller.abort()
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <section className="rounded-card border border-border-subtle bg-surface-card p-8 shadow-card">
        <p className="text-sm font-medium text-brand-600">全栈产品交付工作流 v1.4.1 底座</p>
        <h1 className="mt-2 text-2xl font-semibold text-text-primary">项目初始化已就绪</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">
          当前已预置 React 19、Tailwind CSS v4 品牌 Token、Preline UI、Hono 服务端、PostgreSQL +
          Prisma 底座与门禁脚本。请按 S2–S7 流程补充业务需求、先行测试与页面组件。
        </p>

        <div className="mt-6 flex items-center gap-3 rounded-control border border-border-subtle px-4 py-3 text-sm">
          <span className="font-medium text-text-primary">后端存活探针 (/healthz)：</span>
          {probeState === 'loading' && <span className="text-status-info">检测中...</span>}
          {probeState === 'ok' && <span className="font-medium text-status-success">正常 (200 OK)</span>}
          {probeState === 'unavailable' && (
            <span className="font-medium text-status-warning">
              未连接（开发时请同时运行 npm run dev:server）
            </span>
          )}
        </div>
      </section>
    </main>
  )
}
