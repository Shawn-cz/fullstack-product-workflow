# 阶段路由、裁剪与闭环速查表 (v1.3.1)

> 查阅 124 条规则行号与一跳定位表，请直达 [规范文件/INDEX_TREE.md](../../../../规范文件/INDEX_TREE.md)；新项目一键铺底直达 [规范文件/starter/](../../../../规范文件/starter/README.md)；S8 生产部署包直达 [规范文件/deploy/](../../../../规范文件/deploy/README.md)。

## 1. 任务路径三级裁剪与移动端双模式

| 路径 | 适用场景 | 必选阶段与最小模板 | 免除内容 |
|---|---|---|---|
| **小变更路径** | 文案、低风险局部样式、单点明确小修 | `S0` + `S5/S7`：在 [T01](../../../../规范文件/templates/T01_项目启动与裁剪卡.md) 简记范围，按 [T06](../../../../规范文件/templates/T06_交互与组件规格.md) 对照既有视觉基线与 `theme.css`，实际渲染定向检查 | 免写完整蓝图 T03、状态机 T04、ADR、MVP 排期 |
| **功能路径** | 已有系统内新增功能、修改业务规则或修复逻辑缺陷 | `S0` → `S2(REQ/AC)` → `S3` → `S4/S5` → `S6(测试先行RED)` → `S7(实现GREEN+门禁+指纹)` | 免重画全系统架构、免外部探索访谈（指令型需求） |
| **完整路径** | 新产品从 0 到 1、跨模块重构、条件新建移动 App | `S0`–`S9` 全流程贯通；采用 React + Preline UI + PostgreSQL 黄金栈（`STD-ARC-09`）与 S8 生产部署包（`STD-OPS-07`）；移动端按 [T13](../../../../规范文件/templates/T13_移动App项目补充卡.md) 与 [08_移动App专项.md](../../../../规范文件/08_移动App专项.md) 判定模式 A/B | 远期未进入本轮迭代的功能不提前细化 |

## 2. S0–S9 阶段 → 独立模板 → 工程基座 → 核心规则路由

| 阶段 | 核心目标 | 按需读取的独立模板 / 工具包 | 必查核心规则 |
|---|---|---|---|
| **S0 启动与盘点** | 首读 `PROJECT_INDEX_TREE.md`、定范围、判需求类型、锁黄金栈、判移动模式 A/B | [T01_项目启动与裁剪卡.md](../../../../规范文件/templates/T01_项目启动与裁剪卡.md) | `STD-GOV-01~05`, `STD-FE-05`, `STD-QA-11` |
| **S1 问题与价值** | 探索型做用户访谈；**指令型凭负责人 DEC 直通 S2** | [T02_问题与证据卡.md](../../../../规范文件/templates/T02_问题与证据卡.md)（指令型可省） | `STD-REQ-01~02`, `STD-AI-01` |
| **S2 范围与需求** | 划定系统边界、拆解结构化 **`AC-xxx`（Given/When/Then）** 验收条件 | [T03_蓝图与需求规格.md](../../../../规范文件/templates/T03_蓝图与需求规格.md) | `STD-REQ-01~04`, `STD-QA-01`, `STD-FLOW-01` |
| **S3 业务与状态** | 定义对象、角色×动作×数据范围权限矩阵、状态机与幂等预期 | [T04_业务对象权限状态与行为.md](../../../../规范文件/templates/T04_业务对象权限状态与行为.md) | `STD-BIZ-01~04`, `STD-DAT-01`, `STD-SEC-01` |
| **S4 架构与契约** | 用 [starter/](../../../../规范文件/starter/README.md) 铺底、继承同构契约、RBAC 与对象存储/异步任务基线 | [T05](../../../../规范文件/templates/T05_技术决策数据接口与复用.md) + [contracts/](../../../../规范文件/contracts/README.md) | `STD-ARC-01~09`, `STD-DAT-01~05`, `STD-API-01~08`, `STD-SEC-01~05` |
| **S5 交互与组件** | 继承既有风格或执行授权改版、收口 `src/styles/theme.css` 品牌 Token、设计 React + Preline 组件与 7 态 | [T06_交互与组件规格.md](../../../../规范文件/templates/T06_交互与组件规格.md) + [theme.css.tpl](../../../../规范文件/starter/templates/theme.css.tpl) | `STD-UX-01~04`, `STD-FE-01~07`, `STD-REACT-01~04` |
| **S6 准备与测试先行** | 配置 PostgreSQL Docker + 种子账号 + Playwright 多角色越权 Fixture + `npm run hooks:install` + 双向门禁，写出全覆盖 `@req/@ac` 先行测试（RED） | [T07](../../../../规范文件/templates/T07_测试与验收规格.md), [T08](../../../../规范文件/templates/T08_实施任务与追溯.md), [T12](../../../../规范文件/templates/T12_审计与验收包.md), [ci/](../../../../规范文件/ci/README.md), [rbac-isolation.spec.ts.example](../../../../规范文件/starter/examples/rbac-isolation.spec.ts.example) | `STD-CODE-01~12`, `STD-QA-01~14`, `STD-AUD-07` |
| **S7 实现与指纹闭环** | 特性分支与 Git 快照、写 `@desc` 刷新索引树、接 `logger-trace.ts`、转绿、Pre-commit/CI 门禁（含 `Gate 3d` Playwright 自动越权）、PR 清单与业务验真并锁指纹 | 更新 `T07`, `T08`, `T12` + `npm run index:build` + `npm run gates` + `npm run test:e2e:fresh` | `STD-GOV-05`, `STD-CODE-11~12`, `STD-SEC-05`, `STD-QA-01~14`, `STD-OPS-08`, `STD-AUD-01~07` |
| **S8 发布与运行** | 独立复核/负责人授权、Docker/Caddy HTTPS/双探针部署、变更前 `npm run db:backup` 生成 `.sha256`、Pino 脱敏日志告警 (`QG-04`) | [T09_发布与运行卡.md](../../../../规范文件/templates/T09_发布与运行卡.md) + [deploy/](../../../../规范文件/deploy/README.md) | `STD-OPS-01~08`, `STD-DAT-04`, `STD-QA-12~13` |
| **S9 复盘与交接** | 核对目标差异、处理变更、保存可恢复交接记录 | [T10_复盘变更与交接.md](../../../../规范文件/templates/T10_复盘变更与交接.md) | `STD-REQ-04`, `STD-OPS-04`, `STD-GOV-03~04` |

- **专项按需挂载**：
  - 文件上传/导出与异步定时任务：[storage-jobs-baseline.md](../../../../规范文件/contracts/storage-jobs-baseline.md)（`STD-DAT-05`）
  - 产品内部调用大模型/Agent：[T11_AI产品专项.md](../../../../规范文件/templates/T11_AI产品专项.md)（`STD-AI-04`）
  - 移动 App（先判定模式 A 既有修改对接 vs 模式 B 从 0 新建）：[T13_移动App项目补充卡.md](../../../../规范文件/templates/T13_移动App项目补充卡.md) + [08_移动App专项.md](../../../../规范文件/08_移动App专项.md)（`STD-MOB-01~16`）
