# 团队全栈产品设计与交付工作区规则 (v1.0.0 正式试点版)

本工作区启用《软件产品设计与全栈交付工作流 v1.0.0》（面向零开发经验全栈团队）。当处理任何产品需求、界面设计、代码开发、移动对接、缺陷修复或项目审计任务时，请激活并遵循 `.agents/skills/fullstack-product-delivery/SKILL.md` 技能，并遵守以下核心纪律：

1. **双索引树首读、新项目一键脚手架，严禁读取历史归档包（`STD-GOV-05`）**：
   - 已有业务项目**新开会话先读 `PROJECT_INDEX_TREE.md`**（禁止盲目全仓翻找或重复造轮子）；改完代码立即运行 `npm run index:build` 刷新索引树，新建业务文件前 12 行写 `// @desc 中文职责 | @req/@ac/@api/@comp`。
   - 新建全栈项目优先运行 `node 规范文件/starter/init-project.mjs --target .` 一键落地黄金栈、契约、RBAC 中间件、种子脚本与 CI 底座。
   - 查阅工作流规范先看 `规范文件/INDEX_TREE.md` 按行段切片读取；按阶段仅读取 `规范文件/templates/T01~T13` 单文件模板；**严禁加载 `历史归档_勿喂给AI/`**。
2. **团队默认黄金技术栈与同构契约分离（`STD-ARC-09` / `STD-API-07/08`）**：
   - **Web 前端**：`React 19 + TypeScript (strict) + Vite + Tailwind CSS + Preline UI`（内置 `usePrelineInit` 路由 Hook，或按需 Meta StyleX/Lexical 生态）`+ Zustand / TanStack Query`。**浏览器端严禁导入 `node:crypto` 或 `fingerprint.server.ts`**。
   - **后端与契约**：`Node.js (LTS) + Hono/Fastify + TypeScript + Zod`，前端只引同构 `shared/contracts/base-contract.schema.ts`，服务端同步载荷指纹引 `shared/contracts/fingerprint.server.ts`。
   - **数据库与种子**：**统一使用 `PostgreSQL 16 + Prisma ORM`**（`npm run db:up` 同构容器），**严禁使用 SQLite**；提供 `prisma/seed.ts` 预置 4 角色测试账号与 `npm run db:reset`（含 `NODE_ENV=production` 熔断保护，`STD-QA-14`）。
   - **移动端（双模式，`STD-MOB-01`）**：默认走**模式 A（既有 App 修改优化与 `contracts/` 接口对接）**；仅明确立项从 0 新建 App 时才调用**模式 B（优先 React Native + TS 或原生）**。**严禁选用 Vue 3、Element Plus、Naive UI、uni-app 或 Capacitor。**
3. **认证会话与三层 RBAC 红线（`STD-SEC-05`）**：
   - Web 会话强制使用 PostgreSQL 可吊销 `Session` 表 + `HttpOnly; SameSite=Lax` Cookie（或签名校验的企业 SSO），**严禁将登录令牌存入 `localStorage`**；服务端严格执行“认证 401 → 角色 403 → 数据范围 404/过滤”三层拦截。
4. **双向闭环、四道硬门禁与三重 SHA-256 指纹（`STD-GOV-03` / `STD-QA-01` / `STD-QA-13` / `STD-AUD-07`）**：
   - 先拆结构化 `AC-xxx`，再写覆盖 `docs/` 中全部 `REQ`/`AC` 的 `@req/@ac` 先行测试（RED），再编码转绿（GREEN）并跑通 `npm run gates`（Gate 1 自动核对 `docs/`↔`tests/` 双向覆盖差集与索引树新鲜度；Gate 2 自动拦截 `.skip`/`.only`/空 `catch`/`localStorage` 存令牌/禁用旧栈；Gate 4 校验三重指纹防过期）。
5. **指令型需求直入 S2（`STD-REQ-01`）、Git 快照救生（`STD-CODE-11`）与黑盒验真（`STD-QA-12`）**：
   - 负责人明确指令凭 `DEC` 直入 `S2`；改码前建 Git 保存点；结合 `seed.ts` 输出双无痕窗口越权与 `npm run db:studio` 黑盒验真指南；D0/D1 权限资金、数据迁移及 S8 发布强制走独立审计会话或负责人复核。
