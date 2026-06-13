import { and, eq, inArray, like, ne } from "drizzle-orm";
import db from "../db/index.js";
import { rolePermissionTable } from "../db/schema/role_permission.js";
import { permissionsTable } from "../db/schema/permissions.js";
import type {
  CreatePermissionDTO,
  PermissionQueryDTO,
  UpdatePermissionDTO,
} from "../dto/permissions.dto.js";
import { notDeleted, paginate } from "../utils/query.js";
import { HTTPException } from "hono/http-exception";
import { HTTP_STATUS } from "../utils/const.js";
import {
  toPermissionVO,
  type PermissionListVO,
  type PermissionVO,
} from "../vo/permissions.vo.js";
class PermissionsService {
  /**
   * 新增权限
   */
  async addPermission(permission: CreatePermissionDTO): Promise<PermissionVO> {
    const exists = await this.checkPermissionCodeExists(
      permission.permissionCode,
    );
    if (exists)
      throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
        message: "权限编码已存在",
      });
    const result = await db
      .insert(permissionsTable)
      .values(permission)
      .$returningId();
    const resultPermission = await this.getExistingPermissionById(result[0].id);
    return toPermissionVO(resultPermission);
  }
  /**
   * 删除权限
   */
  async deletePermission(id: string): Promise<{ id: string }> {
    await this.getExistingPermissionById(id);
    await db
      .update(permissionsTable)
      .set({ deletedAt: new Date() })
      .where(and(notDeleted(permissionsTable), eq(permissionsTable.id, id)));
    return { id };
  }
  /**
   * 更新权限
   */
  async updatePermission(
    id: string,
    permission: UpdatePermissionDTO,
  ): Promise<PermissionVO> {
    const existingPermission = await this.getExistingPermissionById(id);
    if (
      permission.permissionCode &&
      permission.permissionCode !== existingPermission.permissionCode
    ) {
      const rows = await db
        .select({ id: permissionsTable.id })
        .from(permissionsTable)
        .where(
          and(
            eq(permissionsTable.permissionCode, permission.permissionCode),
            ne(permissionsTable.id, id),
          ),
        )
        .limit(1);
      if (rows.length > 0) {
        throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
          message: "权限编码已存在",
        });
      }
    }
    if (Object.keys(permission).length > 0) {
      await db
        .update(permissionsTable)
        .set(permission)
        .where(and(notDeleted(permissionsTable), eq(permissionsTable.id, id)));
    }
    const newPermission = await this.getExistingPermissionById(id);
    return toPermissionVO(newPermission);
  }
  /**
   * 获取权限列表
   */
  async getPermissions(query: PermissionQueryDTO): Promise<PermissionListVO> {
    const {
      page,
      pageSize,
      permissionName,
      permissionCode,
      permissionType,
      resource,
      method,
      status,
    } = query;

    const where = and(
      notDeleted(permissionsTable),
      permissionName
        ? like(permissionsTable.permissionName, `%${permissionName}%`)
        : undefined,
      permissionCode
        ? like(permissionsTable.permissionCode, `%${permissionCode}%`)
        : undefined,
      permissionType !== undefined
        ? eq(permissionsTable.permissionType, permissionType)
        : undefined,
      resource ? like(permissionsTable.resource, `%${resource}%`) : undefined,
      method ? eq(permissionsTable.method, method) : undefined,
      status !== undefined ? eq(permissionsTable.status, status) : undefined,
    );

    const result = await paginate(permissionsTable, { page, pageSize }, where);

    return {
      ...result,
      list: result.list.map(toPermissionVO),
    };
  }
  /**
   * 获取权限
   */
  async getPermissionById(id: string): Promise<PermissionVO> {
    const permission = await this.getExistingPermissionById(id);
    return toPermissionVO(permission);
  }
  /**
   * 验证权限是否存在
   */
  async getExistingPermissionById(id: string) {
    const rows = await db
      .select()
      .from(permissionsTable)
      .where(and(notDeleted(permissionsTable), eq(permissionsTable.id, id)))
      .limit(1);
    if (rows.length === 0) {
      throw new HTTPException(HTTP_STATUS.NOT_FOUND, {
        message: "权限不存在",
      });
    }
    return rows[0];
  }
  /**
   *  查询权限 code 是否存在
   */
  async checkPermissionCodeExists(code: string) {
    const result = await db.query.permissionsTable.findFirst({
      where: eq(permissionsTable.permissionCode, code),
    });
    return result;
  }
  /**
   * 根据角色 id获取 权限
   */
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
      if (
        row.permission.deletedAt === null &&
        row.permission.status === 1 &&
        !seen.has(row.permission.id)
      ) {
        seen.add(row.permission.id);
        unique.push(row.permission);
      }
    }
    return unique;
  }
}

export default new PermissionsService();
