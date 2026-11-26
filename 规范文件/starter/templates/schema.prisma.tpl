// @desc PostgreSQL + Prisma 通用数据底座（含用户、可吊销会话、操作审计、幂等载荷指纹表）
// 对应规则：STD-ARC-09（禁用 SQLite）、STD-SEC-05（可吊销会话）、STD-API-08（载荷指纹）、STD-AUD-02

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  HANDLER
  MEMBER
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  displayName  String
  passwordHash String    // 使用 scrypt(随机盐) 或 argon2id，禁止明文或 MD5
  role         UserRole  @default(MEMBER)
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  sessions     Session[]
}

model Session {
  id        String    @id @default(cuid())
  tokenHash String    @unique // 仅存随机 Session Token 的 SHA-256 哈希，不存明文
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime? // 退出/改密/禁用时立即写入时间戳吊销 (STD-SEC-05)
  createdAt DateTime  @default(now())

  @@index([userId])
}

model IdempotencyRecord {
  id                 String   @id @default(cuid())
  actorId            String
  requestId          String
  payloadFingerprint String   // 规范化请求体 64 位 SHA-256 指纹 (STD-API-08)
  statusCode         Int
  responseSnapshot   Json
  createdAt          DateTime @default(now())

  @@unique([actorId, requestId])
}

model AuditLog {
  id             String   @id @default(cuid())
  requestTraceId String
  actorId        String
  action         String
  targetType     String
  targetId       String
  outcome        String   // "SUCCESS" | "DENIED" | "FAILED"
  diffSummary    Json?    // 仅存脱敏前后状态/版本摘要，禁止存敏感正文 (STD-AUD-02)
  createdAt      DateTime @default(now())

  @@index([targetType, targetId])
  @@index([actorId, createdAt])
}
