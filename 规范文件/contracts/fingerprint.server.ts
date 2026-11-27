// @desc 服务端专用同步 SHA-256 载荷指纹计算模块（仅限 Node.js 服务端与 Vitest 测试导入）
/**
 * 软件产品设计与全栈交付工作流 v1.3.1 — 服务端载荷指纹计算器 (STD-API-08)
 *
 * 为什么要与 base-contract.schema.ts 拆分？
 * 避免 React + Vite 浏览器打包时因间接引入 `node:crypto` 报错崩溃。
 * - React 前端 / React Native：只导入 `./base-contract.schema`
 * - Node.js 后端 / Vitest 测试：可导入本文件的同步 `computePayloadFingerprint`
 */
import { createHash } from 'node:crypto'
import { canonicalizeJsonValue } from './base-contract.schema'

/**
 * 计算请求载荷的确定性同步 SHA-256 指纹 (STD-API-08)
 *
 * 规则：
 * 1. 先经 Zod parse 去除未知字段并完成 trim 等规范化；
 * 2. 排除 requestId 本身（若存在于 body）后对规范化 JSON 排序序列化；
 * 3. 返回 64 位小写十六进制 SHA-256 摘要，与 (actorId, requestId) 共同存入 PostgreSQL 去重表。
 */
export function computePayloadFingerprint(normalizedPayload: unknown): string {
  const canonical = JSON.stringify(canonicalizeJsonValue(normalizedPayload))
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}
