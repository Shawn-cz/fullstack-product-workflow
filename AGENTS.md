# 团队全栈产品设计与交付工作区规则 (v0.9.1)

本工作区启用《软件产品设计与全栈交付工作流 v0.9.1》（面向零开发经验全栈团队）。当处理任何产品需求、界面设计、代码开发、移动对接、缺陷修复或项目审计任务时，请激活并遵循 `.agents/skills/fullstack-product-delivery/SKILL.md` 技能，并遵守以下核心纪律：

1. **双索引树首读、按需渐进加载，严禁读取历史归档包（`STD-GOV-05`）**：
   - 已有业务项目**新开会话先读 `PROJECT_INDEX_TREE.md`**（禁止盲目全仓翻找或重复造轮子）；改完代码立即运行 `node scripts/build-index-tree.mjs --write` 刷新索引树（严禁手工编辑），新建业务文件前 12 行写 `// @desc 中文职责 | @req/@ac/@api/@comp`。
   - 查阅工作流规范先看 `规范文件/INDEX_TREE.md` 按行段切片读取；按阶段仅读取 `规范文件/templates/T01~T13` 单文件模板。
   - **严禁将 `历史归档_勿喂给AI/` 目录下的历史基线压缩包、diff 或旧报告加载到日常开发上下文中。**
2. **团队默认黄金技术栈（`STD-ARC-09`）**：
   - **Web 前端**：`React 18/19 + TypeScript (strict) + Vite + Tailwind CSS + Preline UI`（或按需 Meta StyleX/Lexical 生态）`+ Zustand / TanStack Query`。
   - **后端与契约**：`Node.js (LTS) + Hono/Fastify + TypeScript + Zod`，强制继承 `规范文件/contracts/` 通用契约包与 `computePayloadFingerprint` 幂等载荷指纹（`STD-API-07/08`）。
   - **数据库**：**统一使用 `PostgreSQL 16 + Prisma ORM`**（本地用 `规范文件/ci/docker-compose.postgres.yml` 同构容器），**严禁使用 SQLite**。
   - **移动端（双模式，`STD-MOB-01`）**：默认走**模式 A（既有 App 修改优化与 `contracts/` 接口对接）**；仅明确立项从 0 新建 App 时才调用**模式 B（优先 React Native + TS 或 iOS/Android 原生）**。**严禁选用 Vue 3、Element Plus、Naive UI、uni-app 或 Capacitor。**
3. **需求-验收-测试-编码四步闭环与 CI 四道硬门禁（`STD-GOV-03` / `STD-QA-01` / `STD-QA-13`）**：
   - 必须先拆结构化 `AC-xxx`，再写出绑定 `// @req REQ-xxx @ac AC-xxx` 标签的测试骨架并跑出 `RED`，最后编写实现转 `GREEN` 并跑通 `规范文件/ci/verify-gates.mjs` 四道硬门禁（禁 `.skip`/`.only`/空 `catch`）。
4. **三重 SHA-256 指纹与过期失效（`STD-AUD-07`）**：
   - 绑定契约、`prisma/schema.prisma`、依赖锁文件与当前 Commit 的 SHA-256 指纹；任何上游变动导致指纹漂移，旧验收结果自动失效为 `Stale`，必须重验。
5. **指令型需求免除外部访谈形式主义（`STD-REQ-01`）、Git 快照救生（`STD-CODE-11`）与黑盒验真（`STD-QA-12`）**：
   - 负责人明确指令凭 `DEC` 直入 `S2`；改码前建 Git 保存点，每小闭环存快照；输出浏览器渲染、双无痕窗口越权、`npx prisma studio` 查 PostgreSQL 表的黑盒操作指南；D0/D1 权限资金、数据迁移及 S8 发布强制走独立审计会话或负责人复核。
