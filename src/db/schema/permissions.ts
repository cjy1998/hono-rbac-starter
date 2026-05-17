import { index, mysqlTable, tinyint, varchar } from "drizzle-orm/mysql-core";
import { commonSchema } from "./common.js";

export const permissionsTable = mysqlTable(
  "permissions",
  {
    ...commonSchema,
    /**
     * 权限名称
     */
    permissionName: varchar("permission_name", { length: 64 }).notNull(),
    /**
     * 权限编码，如 user:create / order:export / api:/users:GET
     */
    permissionCode: varchar("permission_code", { length: 128 })
      .notNull()
      .unique(),
    /**
     * 1: 按钮/操作
     * 2: API 接口
     * 3: 数据权限
     */
    permissionType: tinyint("permission_type").notNull().default(1),
    /**
     * API 资源路径（permissionType=2 时使用）
     */
    resource: varchar("resource", { length: 255 }).notNull().default(""),
    /**
     * HTTP 方法（permissionType=2 时使用）
     */
    method: varchar("method", { length: 16 }).notNull().default(""),
    /**
     * 0: 禁用  1: 启用
     */
    status: tinyint("status").notNull().default(1),
    remark: varchar("remark", { length: 255 }).notNull().default(""),
  },
  (table) => [
    index("idx_permission_type").on(table.permissionType),
    index("idx_status").on(table.status),
  ],
);
