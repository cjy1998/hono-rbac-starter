import {
  index,
  int,
  mysqlTable,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";
import { commonSchema } from "./common.js";

export const rolesTable = mysqlTable(
  "roles",
  {
    ...commonSchema,
    roleName: varchar("role_name", { length: 64 }).notNull(),
    roleCode: varchar("role_code", { length: 64 }).notNull().unique(),
    sortOrder: int("sort_order").notNull().default(0),
    /**
     * 0: 禁用
     * 1: 启用
     */
    status: tinyint().notNull().default(1),
    remark: varchar({ length: 255 }).notNull().default(""),
  },
  (table) => [index("idx_status").on(table.status)],
);
