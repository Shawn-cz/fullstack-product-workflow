# 通用契约包与基线 (`contracts/`)

版本：0.9.0｜对应规则：`STD-API-06`、`STD-API-07`、`STD-API-08`、`STD-AUD-07`

## 为什么提供本目录？
为防止各项目重复发明不同的分页格式、错误码、成功信封与幂等去重逻辑，并让 **React Web 前端**、**Node.js 服务端** 与 **移动 App（既有 App 对接或新建 App）** 共享唯一权威契约源（SSOT），新项目在 `S4` 阶段应直接复制并继承本目录中的基线文件。

## 包含文件

| 文件 | 用途 | 适用对象 |
|---|---|---|
| [base-contract.schema.ts](base-contract.schema.ts) | Zod + TypeScript 通用响应信封、错误码字典、分页、乐观锁及 `computePayloadFingerprint` SHA-256 指纹计算器 | React Web + Node.js (Hono/Fastify) + React Native |
| [openapi-baseline.yaml](openapi-baseline.yaml) | OpenAPI 3.1.0 公共组件（BearerAuth、分页、RFC 9457 兼容错误响应、409 冲突定义） | iOS (Swift) / Android (Kotlin) 既有原生 App 接口生成与联调 |

## 使用纪律
1. **禁止各端自创错误格式**：所有业务接口在 `T05` 中声明继承本基线，具体业务 Schema 在项目 `shared/contracts/*.schema.ts` 中基于 `createApiResponseSchema` / `createPagedDataSchema` 扩展。
2. **写入接口强制校验载荷指纹（`STD-API-08`）**：带 `requestId` 的创建或高影响写入接口，必须调用 `computePayloadFingerprint` 将规范化请求载荷的 SHA-256 摘要存入 PostgreSQL 去重表，防止“同 ID 换参数”静默吞掉篡改。
3. **契约指纹变更触发重验（`STD-AUD-07`）**：每次修改项目契约文件后，CI Gate 1 与 Gate 4 会重新计算契约与 `prisma/schema.prisma` 的 SHA-256 指纹，与旧指纹绑定的测试验收状态会自动失效为 `Stale（待重验）`。
