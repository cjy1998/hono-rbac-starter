import type { rolesTable } from "../db/schema/roles.js";

type RolePO = typeof rolesTable.$inferSelect;
export interface RoleVO {
  id: string;
  roleName: string;
  roleCode: string;
  sortOrder: number;
  status: number;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export const toRoleVO = (role: RolePO): RoleVO => ({
  id: role.id,
  roleName: role.roleName,
  roleCode: role.roleCode,
  sortOrder: role.sortOrder,
  status: role.status,
  remark: role.remark,
  createdAt: role.createdAt.toISOString(),
  updatedAt: role.updatedAt.toISOString(),
});
