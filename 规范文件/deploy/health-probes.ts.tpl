// @desc 生产存活 (/healthz) 与数据库就绪 (/readyz) 健康检查探针路由骨架 (STD-OPS-02 / STD-OPS-07)
/**
 * 对应规则：STD-OPS-07
 * - GET /healthz：进程存活探针（不查数据库，用于容器快速存活判断）
 * - GET /readyz ：依赖就绪探针（执行 `SELECT 1` 验证 PostgreSQL 真实联通，失败返回 503）
 * 注意：禁止在探针响应中泄露数据库密码、内部堆栈或敏感环境变量。
 */

export interface ProbeResponse {
  status: 'ok' | 'degraded'
  service: string
  version: string
  timestamp: string
  checks?: {
    database: 'up' | 'down'
  }
}

export function buildLivenessPayload(serviceName: string, appVersion: string): ProbeResponse {
  return {
    status: 'ok',
    service: serviceName,
    version: appVersion,
    timestamp: new Date().toISOString()
  }
}

export async function buildReadinessPayload(
  serviceName: string,
  appVersion: string,
  pingDatabase: () => Promise<unknown>
): Promise<{ httpStatus: 200 | 503; body: ProbeResponse }> {
  try {
    await pingDatabase()
    return {
      httpStatus: 200,
      body: {
        status: 'ok',
        service: serviceName,
        version: appVersion,
        timestamp: new Date().toISOString(),
        checks: { database: 'up' }
      }
    }
  } catch {
    return {
      httpStatus: 503,
      body: {
        status: 'degraded',
        service: serviceName,
        version: appVersion,
        timestamp: new Date().toISOString(),
        checks: { database: 'down' }
      }
    }
  }
}
