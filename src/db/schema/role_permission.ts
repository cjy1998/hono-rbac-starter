import {
  char,
  index,
  mysqlTable,
  primaryKey,
  timestamp,
} from "drizzle-orm/mysql-core";
import { permissionsTable } from "./permissions.js";
import { rolesTable } from "./roles.js";

export const rolePermissionTable = mysqlTable(
  "role_permission",
  {
    roleId: char("role_id", { length: 36 })
      .notNull()
      .references(() => rolesTable.id),
    permissionId: char("permission_id", { length: 36 })
      .notNull()
      .references(() => permissionsTable.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("idx_role_id").on(table.roleId),
    index("idx_permission_id").on(table.permissionId),
  ],
);
