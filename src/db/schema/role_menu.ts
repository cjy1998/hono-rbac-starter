import {
  char,
  index,
  mysqlTable,
  primaryKey,
  timestamp,
} from "drizzle-orm/mysql-core";
import { menusTable } from "./menus.js";
import { rolesTable } from "./roles.js";

export const roleMenuTable = mysqlTable(
  "role_menu",
  {
    roleId: char("role_id", { length: 36 })
      .notNull()
      .references(() => rolesTable.id),
    menuId: char("menu_id", { length: 36 })
      .notNull()
      .references(() => menusTable.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.menuId] }),
    index("idx_role_id").on(table.roleId),
    index("idx_menu_id").on(table.menuId),
  ],
);
