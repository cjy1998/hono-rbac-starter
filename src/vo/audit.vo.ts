import type { auditLogsTable } from "../db/schema/audit_log.js";
import type { PaginatedVO } from "./common.vo.js";

type AuditLogPO = typeof auditLogsTable.$inferSelect;

export interface AuditLogVO {
  id: string;
  userId: string | null;
  username: string;
  action: string;
  method: string;
  path: string;
  resourceId: string | null;
  status: number;
  ip: string;
  userAgent: string;
  requestId: string;
  durationMs: number;
  createdAt: string;
}

export const toAuditLogVO = (log: AuditLogPO): AuditLogVO => ({
  id: log.id,
  userId: log.userId,
  username: log.username,
  action: log.action,
  method: log.method,
  path: log.path,
  resourceId: log.resourceId,
  status: log.status,
  ip: log.ip,
  userAgent: log.userAgent,
  requestId: log.requestId,
  durationMs: log.durationMs,
  createdAt: log.createdAt.toISOString(),
});

export type AuditLogListVO = PaginatedVO<AuditLogVO>;
