# 工作流规范自身索引树 (`INDEX_TREE.md`)

版本：1.2.0｜用途：供 AI 与团队成员一屏精准定位本工作流包中的规则行段、全生命周期一键脚手架、独立模板、同构契约与存储/任务基线、RBAC 权限底座、双向闭环 CI/Pre-commit 门禁、Playwright 自动越权底座与 S8 生产部署包，避免每次整份读取 [01_规则库.md](01_规则库.md)。

> **区分概念：** 本文件是**工作流规范包自身**的导航树；实际业务项目根目录由脚本 `scripts/build-index-tree.mjs` 自动生成的是**《项目资产语义索引树》(`PROJECT_INDEX_TREE.md`)**（见 `STD-GOV-05`）。

---

## 1. 工作流目录树（日常运行层）

```text
软件产品全栈交付工作流_v1.2.0/
├── AGENTS.md                                      # 工作区常驻规则入口（AI IDE 自动加载）
├── 开始使用.md / README.md                        # 团队上手指南、一键脚手架与 GitHub 启动口令
├── .agents/skills/fullstack-product-delivery/
│   ├── SKILL.md                                   # 原生 Skill 主指令（黄金栈、一键初始化、ATDD、安全与生产红线）
│   └── references/stage-routing.md                # S0–S9 阶段→模板→规则速查路由
└── 规范文件/
    ├── INDEX_TREE.md                              # 【本文件】规范自身一屏跳转树
    ├── 00_主流程.md                               # S0–S9 执行卡、三级裁剪与 ATDD 四步闭环
    ├── 01_规则库.md                               # 124 条唯一强制规则（按下表行号按需切片读取）
    ├── 02_模板包.md                               # T01–T13 合集（日常优先读下方 templates/ 单文件）
    ├── 03_贯穿案例_工单.md                        # 工单范本（React/Preline/PostgreSQL/@req/@ac/指纹）
    ├── 04_AI项目执行说明.md                       # AI 协作纪律、Git 快照与黑盒验真转化规范
    ├── 05_来源与更新机制.md                       # 50 组第一方来源登记与更新机制
    ├── 06_工程质量与审计验收基线.md               # Git 救生(4.3)、同构与RBAC(5.4)、部署/日志/主题/存储(5.5)、黑盒(6.1)、CI(6.2)、防伪(7.3)
    ├── 07_项目推进与多agent执行.md                # 里程碑、依赖、并行集成与独立交叉审计子 agent
    ├── 08_移动App专项.md                          # 模式 A（既有 App 修改对接）vs 模式 B（条件从 0 新建）
    ├── starter/                                   # 【一键脚手架】init-project.mjs（28 项映射）+ 14 份模板 + S6 越权 E2E 样板
    ├── templates/                                 # 13 份独立按需加载模板（T01–T13，1–9KB/个）
    ├── contracts/                                 # 同构 base-contract.schema.ts + fingerprint.server.ts + OpenAPI + RBAC + 存储与异步任务基线
    ├── ci/                                        # build-index-tree.mjs + 双向闭环 verify-gates.mjs + Pre-commit + PR 模板 + CI + Postgres Compose
    └── deploy/                                    # 【S8 生产部署包】Dockerfile + docker-compose.prod.yml + Caddyfile + 健康探针 + 备份恢复脚本
```

---

## 2. `01_规则库.md` 124 条规则行号精准索引（供 AI 切片读取）

| 节 | 规则前缀与范围 | `01_规则库.md` 起始行 | 核心主题 |
|---|---|---|---|
| A | `STD-GOV-01` ~ `05` | [L11-L20](01_规则库.md#L11-L20) | 治理、上下文、ATDD 追溯闭环、`STD-GOV-05` **项目索引树** |
| B | `STD-REQ-01` ~ `04` | [L21-L29](01_规则库.md#L21-L29) | 探索型 vs 指令型需求豁免、范围与可测量指标 |
| C | `STD-BIZ-01` ~ `04` | [L30-L38](01_规则库.md#L30-L38) | 术语权威、状态机、服务端权限矩阵、幂等与并发 |
| D | `STD-ARC-01` ~ `09` | [L39-L52](01_规则库.md#L39-L52) | 架构决策 ADR、低耦合、`STD-ARC-09` **React+Preline+PostgreSQL 黄金栈** |
| E | `STD-DAT-01` ~ `05` | [L53-L62](01_规则库.md#L53-L62) | 数据字典、持久化事务约束、迁移恢复、`STD-DAT-05` **对象存储直传与异步任务幂等** |
| F | `STD-API-01` ~ `08` | [L63-L75](01_规则库.md#L63-L75) | OpenAPI、RFC 9457、`STD-API-07` **同构契约包**、`STD-API-08` **服务端载荷指纹** |
| G | `STD-UX-01` ~ `04` | [L76-L84](01_规则库.md#L76-L84) | 信息架构、7 态交互、WCAG 2.2 AA 无障碍、用户任务测试 |
| H | `STD-FE-01` ~ `07` | [L85-L96](01_规则库.md#L85-L96) | 组件契约、异步竞态、视觉继承与改版、`STD-FE-07` **品牌 Design Token 统一配置** |
| I | `STD-REACT-01` ~ `04` | [L97-L107](01_规则库.md#L97-L107) | **React + Preline UI / Meta 生态**、`usePrelineInit`、Zustand/TanStack Query |
| J | `STD-CODE-01` ~ `12` | [L108-L124](01_规则库.md#L108-L124) | 复用优先、风格校验、`STD-CODE-11` **Git 快照**、`STD-CODE-12` **Pre-commit 与分支/PR 协作** |
| K | `STD-SEC-01` ~ `05` | [L125-L134](01_规则库.md#L125-L134) | 威胁边界、输入校验、密钥保护、`STD-SEC-05` **可吊销会话与三层 RBAC 红线** |
| L | `STD-QA-01` ~ `14` | [L135-L153](01_规则库.md#L135-L153) | 先行测试 RED、`STD-QA-12` 黑盒验真、`STD-QA-13` **双向闭环 CI 门禁**、`STD-QA-14` **测试种子与重置** |
| M | `STD-OPS-01` ~ `08` | [L154-L166](01_规则库.md#L154-L166) | 发布授权、回退、制品追溯、`STD-OPS-07` **生产容器/HTTPS/探针/备份**、`STD-OPS-08` **Pino 脱敏日志与错误指纹** |
| N | `STD-AI-01` ~ `04` | [L167-L175](01_规则库.md#L167-L175) | AI 事实/假设分离、接受产物核验、AI 产品专项（T11） |
| R | `STD-AUD-01` ~ `07` | [L206-L219](01_规则库.md#L206-L219) | 证据链、审计日志、整改复验、`STD-AUD-07` **三重 SHA-256 指纹防过期** |
| S | `STD-FLOW-01` ~ `08` | [L220-L234](01_规则库.md#L220-L234) | MVP/增量、依赖探针、WIP 控制、子 agent 委派与收回 |
| T | `STD-MOB-01` ~ `16` | [L235-L256](01_规则库.md#L235-L256) | **移动端双模式**（模式 A 对接 / 模式 B 新建）、生命周期、权限、真机与提审 |

---

## 3. 常见场景 → 一跳定位表

| 遇到什么场景 / 问题 | 直接跳转去哪里 |
|---|---|
| 刚新建空项目，想一键铺齐 S0–S8 全生命周期底座 | 运行 `node 规范文件/starter/init-project.mjs --target .`（详见 [starter/](starter/README.md)） |
| 新开 AI 对话，怕 AI 忘记现有组件/接口重复造轮子 | 先读业务项目的 `PROJECT_INDEX_TREE.md`；缺失则运行 `npm run index:build`（[ci/](ci/README.md)） |
| 多人并行开发，想在本地提交前自动拦违规并规范 PR 合并 | 运行 `npm run hooks:install` 启用 `.githooks/pre-commit`，PR 按 [pull_request_template.md](ci/pull_request_template.md) 核验 |
| 写新接口/认证登录，怕前端打包报 `node:crypto` 或写错鉴权 | 读 [contracts/](contracts/README.md) 与 [auth-rbac-baseline.md](contracts/auth-rbac-baseline.md) |
| 要做文件上传下载、导出或定时/异步后台任务 | 读 [storage-jobs-baseline.md](contracts/storage-jobs-baseline.md)（`STD-DAT-05`） |
| 想统一全站品牌色、语义状态色与 Preline 圆角，拒绝默认模板风 | 编辑 `src/styles/theme.css`（源自 [theme.css.tpl](starter/templates/theme.css.tpl)，`STD-FE-07`） |
| 想要全自动跑通双账号越权/401/403/404 与 `HttpOnly` Cookie 验真（免开双无痕窗口） | 运行 `npm run test:e2e:fresh` / `npm run test:e2e:report`（见 [test-accounts.ts.tpl](starter/templates/test-accounts.ts.tpl) 与 [rbac-isolation.spec.ts.example](starter/examples/rbac-isolation.spec.ts.example)） |
| 线上排障需要 `x-request-id` 全链路日志与敏感字段脱敏 | 接入 `server/middleware/logger-trace.ts`（源自 [logger-trace.ts.tpl](starter/templates/logger-trace.ts.tpl)，`STD-OPS-08`） |
| 准备 S8 生产发布（Docker、自动 HTTPS、探针、数据库备份恢复） | 读 [deploy/](deploy/README.md) 并运行 `npm run db:backup`（`STD-OPS-07`） |
| 要改既有 App 还是从 0 新建 App | 看 [08_移动App专项.md](08_移动App专项.md#L1-L35) 与 [T13](templates/T13_移动App项目补充卡.md) 模式 A/B 判定 |
