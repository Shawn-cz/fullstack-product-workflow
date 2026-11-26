// @desc React 路由切换时自动重新初始化 Preline UI 交互插件的标准 Hook | @comp COMP-000
/**
 * 对应规则：STD-REACT-03
 * 用法：在根路由布局组件中调用 `usePrelineInit(pathname)`，防止 SPA 切换页面后
 * Preline 的下拉菜单、弹窗（Modal）、折叠面板（Accordion）等交互失灵。
 */
import { useEffect } from 'react'

interface PrelineStaticMethods {
  autoInit: (collection?: string | string[]) => void
}

declare global {
  interface Window {
    HSStaticMethods?: PrelineStaticMethods
  }
}

export function usePrelineInit(routeDependency: string): void {
  useEffect(() => {
    let active = true
    import('preline/preline')
      .then(() => {
        if (active && window.HSStaticMethods) {
          window.HSStaticMethods.autoInit()
        }
      })
      .catch((err) => {
        console.error('[usePrelineInit] Failed to load Preline UI runtime:', err)
      })
    return () => {
      active = false
    }
  }, [routeDependency])
}
