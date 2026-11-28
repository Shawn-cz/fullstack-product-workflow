# 认证、会话与 RBAC 统一权限底座 (`auth-rbac-baseline.md`)

版本：1.4.0｜对应规则：`STD-BIZ-03`、`STD-SEC-01`、`STD-SEC-04`、`STD-SEC-05`

## 1. 为什么必须统一权限底座？
零开发经验团队从 0 开发带登录的产品时，AI 若无明确安全基线，极易写出以下高危漏洞（直接触发 D0 严重缺陷）：
- 将 JWT 或会话密钥存入浏览器 `localStorage`（易被任意 XSS 窃取）；
- 仅靠前端 `if (role === 'ADMIN')` 隐藏按钮，后端接口不查当前用户角色或数据归属；
- 密码采用明文或弱哈希（MD5/SHA-1），无退出登录服务端吊销机制。

## 2. 团队强制安全红线（`STD-SEC-05`）

| 维度 | 强制采用方案 | 严禁出现的反模式 |
|---|---|---|
| **Web 会话承载** | **PostgreSQL 可吊销 `Session` 表 + `HttpOnly; Secure; SameSite=Lax` Cookie**（开发本地 HTTP 允许免 `Secure`，生产 HTTPS 必开） | 严禁把登录 Token 或 Session ID 存入 `localStorage` / `sessionStorage` 或 URL 参数 |
| **既有企业 SSO 接入** | 若公司已有统一认证网关/OIDC，服务端仅信任经签名验证的网关头或 OIDC ID Token，再映射内部 `AuthenticatedActor` | 严禁信任前端请求体或普通请求头里自己传的 `userId` / `creatorId` / `role` |
| **密码存储** | 使用 Node.js 原生 `crypto.scrypt`（随机 16 字节盐 + `timingSafeEqual` 常量时间比对）或 `argon2id` | 严禁明文、MD5、SHA-1 或不加盐 SHA-256 存密码 |
| **会话吊销** | 退出登录、改密、账号禁用时立即删除或标记失效 PostgreSQL 中对应 `Session` 记录 | 严禁发放永久有效且服务端无法强制踢下线的无状态 Token |
| **移动 App 会话** | 移动端使用短期 Access Token + 可吊销 Refresh Token，令牌仅存入 iOS Keychain / Android Keystore 加密存储（`STD-MOB-05`） | 严禁明文存入 `AsyncStorage` / `SharedPreferences` |

## 3. 服务端三层 RBAC 强制拦截模型

所有受保护接口在服务端必须依次通过三层检查（配套 Hono 中间件 `createRequireAuth` / `requireRole` / `assertOwnerOrRole` 与 `protectedApi` 容器见 [auth-rbac.ts.tpl](../starter/templates/auth-rbac.ts.tpl) 与 [server-index.ts.tpl](../starter/templates/server-index.ts.tpl)）：

1. **第一层：身份认证（`createRequireAuth` / `protectedApi`）**
   - 从 `HttpOnly` Cookie 或可信鉴权头读取会话 ID，查询 PostgreSQL `Session`（校验未过期、未吊销）挂载 `actor: AuthenticatedActor`。
   - 未通过立即返回 **`401 UNAUTHENTICATED`**（统一使用 `buildApiError`）。
2. **第二层：角色动作权限（`requireRole(['HANDLER', 'ADMIN'])`）**
   - 检查 `actor.role` 是否在当前接口允许的角色白名单内（默认拒绝原则）。
   - 未通过立即返回 **`403 FORBIDDEN`**。
3. **第三层：对象数据范围隔离（`assertOwnerOrRole` / 查询加 `where`，默认特权角色为 `[]`）**
   - 列表查询必须在 PostgreSQL `where` 条件直接限制数据范围（如 `MEMBER` 强制 `where: { creatorId: actor.id }`）；
   - 详情/修改/删除查询先核对对象归属（特权角色须由具体业务显式传入），跨用户越权按业务安全策略返回 **`404 NOT_FOUND`**（防止探测他人资源 ID 是否存在）或 `403 FORBIDDEN`。

## 4. 配套 Playwright 自动化双上下文与越权负向测试样板（必做）

每新增一个受保护资源接口，必须在 `tests/` 中包含至少 3 条带 `@req/@ac` 标签的负向用例，并在 S6 基于脚手架预置的 `tests/e2e/fixtures/auth-contexts.ts` 与 [starter/examples/rbac-isolation.spec.ts.example](../starter/examples/rbac-isolation.spec.ts.example) 实例化 `tests/e2e/rbac-isolation.spec.ts`（运行 `npm run test:e2e:fresh` 或 CI `Gate 3d` 自动用程序化双隔离浏览器上下文替代手工开双无痕窗口与 F12 检查）：
- **HttpOnly 会话红线**：校验登录 Cookie 的 `httpOnly === true`，且 `localStorage` 与 `document.cookie` 无凭据泄露；
- **未登录访问**：`anonContext` 无 Cookie 请求 → 断言 `401 UNAUTHENTICATED`；
- **角色越权访问**：`memberA` 调用仅限 `HANDLER`/`ADMIN` 的动作 → 断言 `403 FORBIDDEN` 且数据库记录与审计表均无变化；
- **水平越权访问（IDOR）**：`memberB` 请求 `memberA` 创建的资源详情与列表 → 断言详情返回 `404 NOT_FOUND`、列表结果集完全不含 `memberA` 数据，浏览器直访详情页不泄露内容并留存截图至 Playwright HTML 报告；
- **会话吊销**：`memberA` 退出登录后立即重放请求 → 断言返回 `401 UNAUTHENTICATED`。
