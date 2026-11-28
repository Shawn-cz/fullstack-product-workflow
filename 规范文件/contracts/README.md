# 通用契约包、权限与业务专项基线 (`contracts/`)

版本：1.4.0｜对应规则：`STD-API-06`、`STD-API-07`、`STD-API-08`、`STD-DAT-05`、`STD-SEC-05`、`STD-AUD-07`

## 为什么提供本目录？
为防止各项目重复发明不同的分页格式、错误码、成功信封、鉴权方式、上传/后台任务幂等与去重逻辑，并让 **React Web 前端**、**Node.js 服务端** 与 **移动 App（既有 App 对接或新建 App）** 共享唯一权威契约源（SSOT），新项目在 `S0`/`S4` 通过 `starter/init-project.mjs` 或手动复制直接继承本目录中的基线文件。

## 包含文件

| 文件 | 用途 | 运行环境与适用对象 |
|---|---|---|
| [base-contract.schema.ts](base-contract.schema.ts) | **浏览器/Node 同构** Zod 通用响应信封（含 `buildApiSuccess`/`buildApiError` 构造函数）、错误码字典、分页、乐观锁、认证主体 `AuthenticatedActor` 及 `canonicalizeJsonValue`（零 Node 内置依赖） | React + Vite Web、Node.js 服务端、React Native |
| [fingerprint.server.ts](fingerprint.server.ts) | Node.js 服务端专用同步 SHA-256 载荷指纹计算器 `computePayloadFingerprint`（物理隔离 `node:crypto`，彻底避免前端 Vite 打包报错） | Node.js (Hono/Fastify) 服务端、Vitest 测试 |
| [openapi-baseline.yaml](openapi-baseline.yaml) | OpenAPI 3.1.0 公共组件（BearerAuth、分页、RFC 9457 兼容错误响应、409 冲突定义） | iOS (Swift) / Android (Kotlin) 既有原生 App 接口生成与联调 |
| [auth-rbac-baseline.md](auth-rbac-baseline.md) | 认证、可吊销 PostgreSQL 会话、`HttpOnly` Cookie 与三层 RBAC 权限拦截基线（配套代码模板在 `starter/templates/auth-rbac.ts.tpl`） | 所有带登录与权限控制的全栈产品 |
| [storage-jobs-baseline.md](storage-jobs-baseline.md) | 文件上传对象存储（S3/OSS 预签名 + MIME/魔数校验 + 私有桶隔离）与异步定时任务幂等（`jobKey` + `lockedUntil` 租约 + 死信告警）专项基线 | 业务涉及文件上传/导出或后台定时任务时按需启用（`STD-DAT-05`） |

## 使用纪律
1. **严格区分同构与服务端导入**：React 前端组件只允许导入 `base-contract.schema.ts`；严禁在浏览器端导入 `fingerprint.server.ts`。
2. **禁止各端自创错误格式**：所有业务接口在 `T05` 中声明继承本基线，具体业务 Schema 在项目 `shared/contracts/*.schema.ts` 中基于 `createApiResponseSchema` / `createPagedDataSchema` 扩展。
3. **写入接口强制校验载荷指纹（`STD-API-08`）**：带 `requestId` 的创建或高影响写入接口，必须调用服务端 `computePayloadFingerprint` 将规范化请求载荷的 SHA-256 摘要存入 PostgreSQL 去重表，防止“同 ID 换参数”静默吞掉篡改。
4. **契约指纹变更触发重验（`STD-AUD-07`）**：每次修改项目契约文件后，CI Gate 4 会重新计算契约与 `prisma/schema.prisma` 的 SHA-256 指纹，与旧指纹绑定的测试验收状态会自动失效为 `Stale（待重验）`。
