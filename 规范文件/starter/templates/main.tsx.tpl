// @desc React 19 应用根挂载入口与统一品牌主题样式加载 | @comp COMP-ROOT
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/theme.css'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root mount element #root not found')
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
)
