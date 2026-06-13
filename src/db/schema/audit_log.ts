import {
  char,
  index,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { v4 as uuidv4 } from "uuid";

/**
 * 审计日志表
 * 记录所有写操作（POST / PUT / PATCH / DELETE）的关键信息，
 * 用于安全追溯与合规审计。只追加、不修改、不软删。
 */
export const auditLogsTable = mysqlTable(
  "audit_logs",
  {
    id: char("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => uuidv4()),
    /**
     * 操作人 ID，未登录场景（如登录失败）可为空
     */
    userId: char("user_id", { length: 36 }),
    /**
     * 操作人用户名快照，便于用户被删除后仍可追溯
     */
    username: varchar("username", { length: 64 }).notNull().default(""),
    /**
     * 操作标识，形如 "POST /user"
     */
    action: varchar("action", { length: 160 }).notNull(),
    /**
     * HTTP 方法
     */
    method: varchar("method", { length: 16 }).notNull(),
    /**
     * 请求路径
     */
    path: varchar("path", { length: 255 }).notNull(),
    /**
     * 资源 ID（来自路径参数 :id，可为空）
     */
    resourceId: char("resource_id", { length: 36 }),
    /**
     * 响应 HTTP 状态码
     */
    status: int("status").notNull(),
    /**
     * 客户端 IP
     */
    ip: varchar("ip", { length: 64 }).notNull().default(""),
    /**
     * User-Agent
     */
    userAgent: varchar("user_agent", { length: 512 }).notNull().default(""),
    /**
     * 关联的请求 ID，便于和应用日志串联
     */
    requestId: varchar("request_id", { length: 64 }).notNull().default(""),
    /**
     * 请求耗时（毫秒）
     */
    durationMs: int("duration_ms").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_id").on(table.userId),
    index("idx_action").on(table.action),
    index("idx_created_at").on(table.createdAt),
  ],
);
