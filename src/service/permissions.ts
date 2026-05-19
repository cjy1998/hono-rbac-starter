import { inArray } from "drizzle-orm";
import db from "../db/index.js";
import { rolePermissionTable } from "../db/schema/role_permission.js";

class PermissionsService {
  async getPermissionsByRoleIds(roleIds: string[]) {
    if (roleIds.length === 0) return [];

    const rows = await db.query.rolePermissionTable.findMany({
      where: inArray(rolePermissionTable.roleId, roleIds),
      with: {
        permission: true,
      },
    });

    // 按 permission.id 去重（多角色可能授予相同权限）
    const seen = new Set<string>();
    const unique: (typeof rows)[number]["permission"][] = [];
    for (const row of rows) {
      if (!seen.has(row.permission.id)) {
        seen.add(row.permission.id);
        unique.push(row.permission);
      }
    }
    return unique;
  }
}

export default new PermissionsService();