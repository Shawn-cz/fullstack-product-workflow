<!-- 软件产品设计与全栈交付工作流 v1.2.0 — 多人协作 PR 审核模板 (STD-CODE-12 / STD-QA-12~13 / STD-AUD-07) -->

## 1. 变更目标与闭环关联
- **任务路径**：[ ] 完整路径  [ ] 功能路径  [ ] 小变更路径
- **关联需求与验收条件（`T03`）**：`REQ-___` / `AC-___`
- **关联实施任务（`T08`）**：`TASK-___`
- **一句话变更说明**：

---

## 2. 自动化门禁与三重 SHA-256 指纹核验（`STD-QA-13` / `STD-AUD-07`）
- [ ] 已运行 `npm run index:build` 刷新 `PROJECT_INDEX_TREE.md`（无过时索引）
- [ ] 本地/CI 四道门禁（Gate 1 双向覆盖 / Gate 2 安全与防作弊 / Gate 3 PostgreSQL 测试 / Gate 4 指纹）全部通过
- [ ] 本次 `verify-gates.mjs --gate=4` 输出的指纹摘要（必填）：
  - Commit SHA：`_______`
  - 契约目录 SHA-256 前 12 位：`____________`
  - `prisma/schema.prisma` SHA-256 前 12 位：`____________`

---

## 3. 自动化越权闭环与零经验成员黑盒验真证据（`STD-QA-12` / `STD-QA-14`）
- [ ] Gate 3d Playwright 双隔离上下文自动越权测试（`member_a`/`member_b`/`HttpOnly` Cookie/会话吊销）全部通过，并已附 `playwright-rbac-report` 截图报告（尚未到 S6 时写明原因并附手工双无痕窗口核验）
- [ ] 已在真实浏览器或 E2E 报告中核对核心业务界面、文案与 Preline 交互体验（无样式漂移/溢出）
- [ ] 已通过 `npm run db:studio` 核对 PostgreSQL 真实落库字段与 `payloadFingerprint`
- **证据截图/Playwright 报告路径**（位于 `docs/evidence/` 或 CI Artifact 链接）：

---

## 4. 数据库迁移与高风险独立复核门禁（`STD-CODE-12` / `STD-QA-12`）
- [ ] 如涉及 `prisma/migrations/` 变更：合并前已 `git pull --rebase origin main`，未修改历史已合并迁移文件
- [ ] 是否触及 **D0/D1 权限资金、破坏性数据迁移（`STD-DAT-04`）或 `S8` 生产发布**？
  - [ ] 否（常规低风险变更）
  - [ ] 是 → **必须附上独立上下文 AI 交叉审计结论或团队负责人复核签字**：
    - 复核人 / 独立审计记录链接：
