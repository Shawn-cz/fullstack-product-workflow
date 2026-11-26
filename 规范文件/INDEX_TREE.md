# 工作流规范自身索引树 (`INDEX_TREE.md`)

版本：0.9.1｜用途：供 AI 与团队成员一屏精准定位本工作流包中的规则行段、独立模板、契约基线与 CI 门禁脚本，避免每次整份读取 38KB 的 [01_规则库.md](01_规则库.md)。

> **区分概念：** 本文件是**工作流规范包自身**的导航树；实际业务项目根目录由脚本 `scripts/build-index-tree.mjs` 自动生成的是**《项目资产语义索引树》(`PROJECT_INDEX_TREE.md`)**（见 `STD-GOV-05`）。

---

## 1. 工作流目录树（日常运行层）

```text
软件产品全栈交付工作流_v0.9.1/
├── AGENTS.md                                      # 工作区常驻规则入口（AI IDE 自动加载）
├── 开始使用.md / README.md                        # 团队上手指南与 GitHub 一键启动口令
├── .agents/skills/fullstack-product-delivery/
│   ├── SKILL.md                                   # 原生 Skill 主指令（黄金栈、ATDD 闭环、防违规表）
│   └── references/stage-routing.md                # S0–S9 阶段→模板→规则速查路由
└── 规范文件/
    ├── INDEX_TREE.md                              # 【本文件】规范自身一屏跳转树
    ├── 00_主流程.md                               # S0–S9 执行卡、三级裁剪与 ATDD 四步闭环
    ├── 01_规则库.md                               # 117 条唯一强制规则（按下表行号按需切片读取）
    ├── 02_模板包.md                               # T01–T13 合集（日常优先读下方 templates/ 单文件）
    ├── 03_贯穿案例_工单.md                        # 工单范本（React/Preline/PostgreSQL/@req/@ac/指纹）
    ├── 04_AI项目执行说明.md                       # AI 协作纪律、Git 快照与黑盒验真转化规范
    ├── 05_来源与更新机制.md                       # 50 组第一方来源登记与更新机制
    ├── 06_工程质量与审计验收基线.md               # Git 救生(4.3)、契约指纹(5.4)、黑盒(6.1)、CI(6.2)、防伪(7.3)
    ├── 07_项目推进与多agent执行.md                # 里程碑、依赖、并行集成与独立交叉审计子 agent
    ├── 08_移动App专项.md                          # 模式 A（既有 App 修改对接）vs 模式 B（条件从 0 新建）
    ├── templates/                                 # 13 份独立按需加载模板（T01–T13，1–9KB/个）
    ├── contracts/                                 # 通用契约包（base-contract.schema.ts + openapi-baseline.yaml）
    └── ci/                                        # build-index-tree.mjs + verify-gates.mjs + CI + Postgres Compose
```

---

## 2. `01_规则库.md` 117 条规则行号精准索引（供 AI 切片读取）

| 节 | 规则前缀与范围 | `01_规则库.md` 起始行 | 核心主题 |
|---|---|---|---|
| A | `STD-GOV-01` ~ `05` | [L11-L20](01_规则库.md#L11-L20) | 治理、上下文、ATDD 追溯闭环、`STD-GOV-05` **项目索引树** |
| B | `STD-REQ-01` ~ `04` | [L21-L29](01_规则库.md#L21-L29) | 探索型 vs 指令型需求豁免、范围与可测量指标 |
| C | `STD-BIZ-01` ~ `04` | [L30-L38](01_规则库.md#L30-L38) | 术语权威、状态机、服务端权限矩阵、幂等与并发 |
| D | `STD-ARC-01` ~ `09` | [L39-L52](01_规则库.md#L39-L52) | 架构决策 ADR、低耦合、`STD-ARC-09` **React+Preline+PostgreSQL 黄金栈** |
| E | `STD-DAT-01` ~ `04` | [L53-L61](01_规则库.md#L53-L61) | 数据字典、持久化事务约束、导入统计、迁移备份恢复 |
| F | `STD-API-01` ~ `08` | [L62-L74](01_规则库.md#L62-L74) | OpenAPI、RFC 9457 错误、派生、`STD-API-07` **通用契约包**、`STD-API-08` **载荷指纹** |
| G | `STD-UX-01` ~ `04` | [L75-L83](01_规则库.md#L75-L83) | 信息架构、7 态交互、WCAG 2.2 AA 无障碍、用户任务测试 |
| H | `STD-FE-01` ~ `06` | [L84-L94](01_规则库.md#L84-L94) | 组件契约、Design Token、异步竞态、视觉继承与授权改版 |
| I | `STD-REACT-01` ~ `04` | [L95-L105](01_规则库.md#L95-L105) | **React + Preline UI / Meta 生态**、Hooks 清理、Zustand/TanStack Query |
| J | `STD-CODE-01` ~ `11` | [L106-L121](01_规则库.md#L106-L121) | 复用优先、风格校验、错误处理、`STD-CODE-11` **Git 快照救生** |
| K | `STD-SEC-01` ~ `04` | [L122-L130](01_规则库.md#L122-L130) | 威胁边界、输入校验、密钥与敏感数据保护、OWASP ASVS |
| L | `STD-QA-01` ~ `13` | [L131-L148](01_规则库.md#L131-L148) | 先行测试 RED、视觉实测、`STD-QA-12` **黑盒验真与独立复核**、`STD-QA-13` **CI 四道门禁** |
| M | `STD-OPS-01` ~ `06` | [L149-L159](01_规则库.md#L149-L159) | 发布授权、监控告警、回退、制品可重建、版本兼容 |
| N | `STD-AI-01` ~ `04` | [L160-L167](01_规则库.md#L160-L167) | AI 事实/假设分离、接受产物核验、AI 产品专项（T11） |
| R | `STD-AUD-01` ~ `07` | [L199-L212](01_规则库.md#L199-L212) | 证据链、审计日志、整改复验、`STD-AUD-07` **三重 SHA-256 指纹防过期** |
| S | `STD-FLOW-01` ~ `08` | [L213-L227](01_规则库.md#L213-L227) | MVP/增量、依赖探针、WIP 控制、子 agent 委派与收回 |
| T | `STD-MOB-01` ~ `16` | [L228-L249](01_规则库.md#L228-L249) | **移动端双模式**（模式 A 对接 / 模式 B 新建）、生命周期、权限、真机与提审 |

---

## 3. 常见场景 → 一跳定位表

| 遇到什么场景 / 问题 | 直接跳转去哪里 |
|---|---|
| 新开 AI 对话，怕 AI 忘记现有组件/接口重复造轮子 | 先读业务项目的 `PROJECT_INDEX_TREE.md`；缺失则运行 `node scripts/build-index-tree.mjs --write`（[ci/](ci/README.md)） |
| 写新接口不知道信封、分页、错误码、幂等怎么定义 | 复制 [base-contract.schema.ts](contracts/base-contract.schema.ts) 与 [openapi-baseline.yaml](contracts/openapi-baseline.yaml) |
| 要配本地数据库与 CI 自动化门禁 | 复制 [docker-compose.postgres.yml](ci/docker-compose.postgres.yml)、[github-actions-ci.yml](ci/github-actions-ci.yml) 与 [verify-gates.mjs](ci/verify-gates.mjs) |
| 零经验成员不知道怎么验收 AI 写的代码 | 看 [06_工程质量与审计验收基线.md](06_工程质量与审计验收基线.md#L162-L176) 黑盒验真表 + [03_贯穿案例_工单.md](03_贯穿案例_工单.md#L305-L335) 范本 |
| 要改既有 App 还是从 0 新建 App | 看 [08_移动App专项.md](08_移动App专项.md#L1-L35) 与 [T13](templates/T13_移动App项目补充卡.md) 模式 A/B 判定 |
