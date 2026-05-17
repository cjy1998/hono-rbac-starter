import {
  char,
  index,
  mysqlTable,
  primaryKey,
  timestamp,
} from "drizzle-orm/mysql-core";
import { rolesTable } from "./roles.js";
import { usersTable } from "./users.js";

export const userRoleTable = mysqlTable(
  "user_role",
  {
    userId: char("user_id", { length: 36 })
      .notNull()
      .references(() => usersTable.id),
    roleId: char("role_id", { length: 36 })
      .notNull()
      .references(() => rolesTable.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index("idx_user_id").on(table.userId),
    index("idx_role_id").on(table.roleId),
  ],
);
