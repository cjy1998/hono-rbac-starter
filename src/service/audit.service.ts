import { and, count, desc, eq, like } from "drizzle-orm";
import db from "../db/index.js";
import { auditLogsTable } from "../db/schema/audit_log.js";
import type { AuditLogInput, AuditLogQueryDTO } from "../dto/audit.dto.js";
import { logger } from "../utils/logger.js";
import { toAuditLogVO, type AuditLogListVO } from "../vo/audit.vo.js";

class AuditService {
  /**
   * 写入审计日志。
   * 审计失败不应影响主流程，因此内部吞掉异常并降级为应用日志。
   */
  async record(input: AuditLogInput): Promise<void> {
    try {
      await db.insert(auditLogsTable).values(input);
    } catch (err) {
      logger.error("failed to write audit log", {
        requestId: input.requestId,
        action: input.action,
        error: err,
      });
    }
  }

  /**
   * 分页查询审计日志，按时间倒序
   */
  async getAuditLogs(query: AuditLogQueryDTO): Promise<AuditLogListVO> {
    const { page, pageSize, userId, action, method, path } = query;

    const where = and(
      userId ? eq(auditLogsTable.userId, userId) : undefined,
      action ? like(auditLogsTable.action, `%${action}%`) : undefined,
      method ? eq(auditLogsTable.method, method) : undefined,
      path ? like(auditLogsTable.path, `%${path}%`) : undefined,
    );

    const [rows, totalResult] = await Promise.all([
      db
        .select()
        .from(auditLogsTable)
        .where(where)
        .orderBy(desc(auditLogsTable.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(auditLogsTable).where(where),
    ]);

    return {
      list: rows.map(toAuditLogVO),
      total: totalResult[0].total,
      page,
      pageSize,
    };
  }
}

export default new AuditService();
