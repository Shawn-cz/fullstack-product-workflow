/*
 * @desc 团队统一品牌 Design Token 预设（Tailwind CSS v4 @theme + Preline UI 语义变量） | @comp COMP-THEME
 * 对应规则：STD-FE-02、STD-FE-05、STD-FE-07
 * 说明：所有新建 Web 页面默认引入本文件；严禁在组件内硬编码散落色值破坏跨页视觉一致性。
 *       若某产品获负责人批准采用独立品牌色，仅在项目本地覆盖下方品牌变量，不私自改写全局基础间距与焦点环规则。
 */
@import "tailwindcss";
@import "preline/variants.css";

@theme {
  /* 品牌主色与交互色（默认团队中性蓝，符合 WCAG 2.2 AA 文本对比度） */
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-500: #2563eb;
  --color-brand-600: #1d4ed8;
  --color-brand-700: #1e40af;

  /* 语义状态色（禁止仅靠颜色传达状态，须配合文字或图标，见 STD-UX-03） */
  --color-status-success: #15803d;
  --color-status-success-bg: #f0fdf4;
  --color-status-warning: #b45309;
  --color-status-warning-bg: #fffbeb;
  --color-status-danger: #b91c1c;
  --color-status-danger-bg: #fef2f2;
  --color-status-info: #0369a1;
  --color-status-info-bg: #f0f9ff;

  /* 中性表面与边框层级 */
  --color-surface-page: #f8fafc;
  --color-surface-card: #ffffff;
  --color-border-subtle: #e2e8f0;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;

  /* 统一字体栈（中英文混排清晰可读） */
  --font-sans: "Inter", "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* 统一圆角与卡片阴影层级 */
  --radius-control: 0.5rem;
  --radius-card: 0.75rem;
  --radius-modal: 1rem;
  --shadow-card: 0 1px 2px 0 rgb(15 23 42 / 0.05);
  --shadow-popover: 0 10px 25px -5px rgb(15 23 42 / 0.12);
}

/* 全局键盘焦点可见性与减少动画偏好（STD-UX-03 / STD-FE-06） */
:root {
  --focus-ring-color: var(--color-brand-500);
}

:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
