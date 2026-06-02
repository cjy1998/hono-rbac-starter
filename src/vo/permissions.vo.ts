import type { permissionsTable } from "../db/schema/permissions.js";
import type { PaginatedVO } from "./common.vo.js";

type PermissionPO = typeof permissionsTable.$inferSelect;
export interface PermissionVO {
  id: string;
  permissionName: string;
  permissionCode: string;
  permissionType: number;
  resource: string;
  status: number;
  method: string;
  remark: string;
  createdAt: string;
  updatedAt: string;
}

export const toPermissionVO = (permission: PermissionPO): PermissionVO => ({
  id: permission.id,
  permissionName: permission.permissionName,
  permissionCode: permission.permissionCode,
  permissionType: permission.permissionType,
  resource: permission.resource,
  status: permission.status,
  method: permission.method,
  remark: permission.remark,
  createdAt: permission.createdAt.toISOString(),
  updatedAt: permission.updatedAt.toISOString(),
});

export type PermissionListVO = PaginatedVO<PermissionVO>;
