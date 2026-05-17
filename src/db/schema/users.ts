import { index, mysqlTable, tinyint, varchar } from "drizzle-orm/mysql-core";
import { commonSchema } from "./common.js";

export const usersTable = mysqlTable(
  "users",
  {
    ...commonSchema,
    username: varchar({ length: 64 }).notNull().unique(),
    nickname: varchar({ length: 64 }).notNull(),
    password: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 128 }).notNull().unique(),
    phone: varchar({ length: 20 }).notNull().default(""),
    avatar: varchar({ length: 255 }).notNull().default(""),
    /**
     * 0: 禁用
     * 1: 启用
     */
    status: tinyint().notNull().default(1),
  },
  (table) => [
    index("idx_email").on(table.email),
    index("idx_status").on(table.status),
  ],
);
