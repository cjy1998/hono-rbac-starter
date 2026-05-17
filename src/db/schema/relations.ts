import { relations } from "drizzle-orm";
import { menusTable } from "./menus.js";
import { permissionsTable } from "./permissions.js";
import { rolePermissionTable } from "./role_permission.js";
import { roleMenuTable } from "./role_menu.js";
import { rolesTable } from "./roles.js";
import { userRoleTable } from "./user_role.js";
import { usersTable } from "./users.js";

/**
 * 用户：一个用户可以拥有多个角色
 */
export const usersRelations = relations(usersTable, ({ many }) => ({
  userRoles: many(userRoleTable),
}));

/**
 * 角色：一个角色可以分配给多个用户，也可以拥有多个权限和菜单
 */
export const rolesRelations = relations(rolesTable, ({ many }) => ({
  userRoles: many(userRoleTable),
  rolePermissions: many(rolePermissionTable),
  roleMenus: many(roleMenuTable),
}));

/**
 * 权限：一个权限可以分配给多个角色
 */
export const permissionsRelations = relations(permissionsTable, ({ many }) => ({
  rolePermissions: many(rolePermissionTable),
}));

/**
 * 菜单：一个菜单可以分配给多个角色
 */
export const menusRelations = relations(menusTable, ({ many }) => ({
  roleMenus: many(roleMenuTable),
}));

/**
 * 用户-角色 关联：反向查关联记录所属的用户和角色
 */
export const userRoleRelations = relations(userRoleTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userRoleTable.userId],
    references: [usersTable.id],
  }),
  role: one(rolesTable, {
    fields: [userRoleTable.roleId],
    references: [rolesTable.id],
  }),
}));

/**
 * 角色-权限 关联：反向查关联记录所属的角色和权限
 */
export const rolePermissionRelations = relations(
  rolePermissionTable,
  ({ one }) => ({
    role: one(rolesTable, {
      fields: [rolePermissionTable.roleId],
      references: [rolesTable.id],
    }),
    permission: one(permissionsTable, {
      fields: [rolePermissionTable.permissionId],
      references: [permissionsTable.id],
    }),
  }),
);

/**
 * 角色-菜单 关联：反向查关联记录所属的角色和菜单
 */
export const roleMenuRelations = relations(roleMenuTable, ({ one }) => ({
  role: one(rolesTable, {
    fields: [roleMenuTable.roleId],
    references: [rolesTable.id],
  }),
  menu: one(menusTable, {
    fields: [roleMenuTable.menuId],
    references: [menusTable.id],
  }),
}));
