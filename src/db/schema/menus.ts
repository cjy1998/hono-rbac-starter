import {
  char,
  index,
  int,
  mysqlTable,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";
import { commonSchema } from "./common.js";

export const menusTable = mysqlTable(
  "menus",
  {
    ...commonSchema,
    /**
     * 父菜单 ID，顶级菜单为 "0"
     */
    parentId: char("parent_id", { length: 36 }).notNull().default("0"),
    /**
     * 菜单名称
     */
    menuName: varchar("menu_name", { length: 64 }).notNull(),
    /**
     * 1: 目录
     * 2: 菜单
     * 3: 外链
     */
    menuType: tinyint("menu_type").notNull(),
    /**
     * 路由路径
     */
    path: varchar("path", { length: 255 }).notNull().default(""),
    /**
     * 前端组件路径
     */
    component: varchar("component", { length: 255 }).notNull().default(""),
    /**
     * 图标
     */
    icon: varchar("icon", { length: 64 }).notNull().default(""),
    /**
     * 重定向地址
     */
    redirect: varchar("redirect", { length: 255 }).notNull().default(""),
    /**
     * 关联的权限编码（前端用于按钮显隐 / 后端鉴权可见性）
     */
    permissionCode: varchar("permission_code", { length: 128 })
      .notNull()
      .default(""),
    /**
     * 0: 隐藏  1: 显示
     */
    visible: tinyint("visible").notNull().default(1),
    /**
     * 0: 不缓存  1: 缓存
     */
    keepAlive: tinyint("keep_alive").notNull().default(0),
    /**
     * 排序
     */
    sortOrder: int("sort_order").notNull().default(0),
    /**
     * 0: 禁用  1: 启用
     */
    status: tinyint("status").notNull().default(1),
  },
  (table) => [
    index("idx_parent_id").on(table.parentId),
    index("idx_status").on(table.status),
  ],
);
