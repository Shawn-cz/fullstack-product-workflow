# Session Handoff

日期：2026-11-27（Asia/Shanghai）｜工作流版本：1.3.1（跨端固化与预置认证路由版）

## 本轮里程碑（1.3.0 → 1.3.1）

针对模拟全新 `git clone` 复查暴露的 8 项跨系统、容器构建与服务端细节问题，完成全部修复并升级为 **`v1.3.1`**：
1. **跨平台换行符与指纹一致性**：母版与脚手架均新增 `.gitattributes`（LF），`verify-gates.mjs` 与 `build-index-tree.mjs` 对文本文件做 `\r\n → \n` 归一化后再哈希，`pre-commit.hook` 改为纯 `#!/usr/bin/env node`。
2. **容器安全与多项目防冲突**：脚手架新增生成 `.dockerignore`，移除 `docker-compose.postgres.yml` 固定 `container_name`，`backup-postgres.mjs` 支持自动定位 Compose 容器；`Dockerfile` 与 CI 统一使用 Node 22 LTS。
3. **预置认证路由与服务端修复**：新增 `starter/templates/auth-routes.ts.tpl`（`server/routes/auth.ts`，开箱对齐 `auth-contexts.ts`）；修复 `server/index.ts` `onError` `requestTraceId` 不一致、挂载独立 `api` 子路由并缓存 `dist/index.html`。
4. **新克隆自检闭环**：移除 `README.md` 对 `.gitignore` 目标的链接，`maintain-workflow.mjs --check` 新增检测“tracked `.md` 禁止链接 ignored 目标”。

## 当前体系规模
- 10 阶段（S0–S9）｜**124 条**唯一有效规则（含 16 条移动专项）｜13 份独立单文件模板｜50 组第一方来源
- 5 个工程与技能目录：`starter/`（22 文件：含 `init-project.mjs`、`README.md`、19 份模板与 1 份 S6 样板）、`contracts/`（6 文件）、`ci/`（8 文件）、`deploy/`（6 文件）、`.agents/skills/`（2 文件）
