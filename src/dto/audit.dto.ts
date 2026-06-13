import { z } from "zod";
import { paginationSchema } from "./common.dto.js";

export const auditLogQuerySchema = paginationSchema.extend({
  userId: z.string().trim().optional(),
  action: z.string().trim().optional(),
  method: z.string().trim().optional(),
  path: z.string().trim().optional(),
});

export type AuditLogQueryDTO = z.infer<typeof auditLogQuerySchema>;

/**
 * 写入一条审计日志所需的数据
 */
export interface AuditLogInput {
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
}
