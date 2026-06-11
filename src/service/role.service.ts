import { and, eq, inArray, like, ne } from "drizzle-orm";
import db from "../db/index.js";
import { menusTable } from "../db/schema/menus.js";
import { permissionsTable } from "../db/schema/permissions.js";
import { roleMenuTable } from "../db/schema/role_menu.js";
import { rolePermissionTable } from "../db/schema/role_permission.js";
import { rolesTable } from "../db/schema/roles.js";
import { notDeleted, paginate } from "../utils/query.js";
import type {
  CreateRoleDTO,
  UpdateRoleDTO,
  RoleQueryDTO,
} from "../dto/role.dto.js";
import type { MenuIdsDTO, PermissionIdsDTO } from "../dto/common.dto.js";
import { toRoleVO, type RoleVO, type RoleListVO } from "../vo/roles.vo.js";
import { HTTP_STATUS } from "../utils/const.js";
import { HTTPException } from "hono/http-exception";
class RoleService {
  /**
   * 创建角色
   */
  async createRole(role: CreateRoleDTO): Promise<RoleVO> {
    const rows = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.roleCode, role.roleCode))
      .limit(1);
    if (rows.length > 0) {
      throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
        message: "角色已存在",
      });
    }
    const result = await db.insert(rolesTable).values(role).$returningId();
    const resultRole = await this.getExistingRoleById(result[0].id);
    return toRoleVO(resultRole);
  }
  /**
   * 删除角色
   */
  async deleteRole(id: string): Promise<{ id: string }> {
    await this.getExistingRoleById(id);
    await db
      .update(rolesTable)
      .set({ deletedAt: new Date() })
      .where(and(notDeleted(rolesTable), eq(rolesTable.id, id)));
    return { id };
  }
  /**
   * 更新角色
   */
  async updateRole(id: string, role: UpdateRoleDTO): Promise<RoleVO> {
    const existingRole = await this.getExistingRoleById(id);
    if (role.roleCode && role.roleCode !== existingRole.roleCode) {
      const rows = await db
        .select({ id: rolesTable.id })
        .from(rolesTable)
        .where(
          and(eq(rolesTable.roleCode, role.roleCode), ne(rolesTable.id, id)),
        )
        .limit(1);
      if (rows.length > 0) {
        throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
          message: "角色编码已存在",
        });
      }
    }
    await db
      .update(rolesTable)
      .set(role)
      .where(and(notDeleted(rolesTable), eq(rolesTable.id, id)));
    const newRole = await this.getExistingRoleById(id);
    return toRoleVO(newRole);
  }

  /**
   * 获取列表
   */
  async getRoles(query: RoleQueryDTO): Promise<RoleListVO> {
    const { page, pageSize, status, roleCode, roleName } = query;

    const where = and(
      notDeleted(rolesTable),
      roleName ? like(rolesTable.roleName, `%${roleName}%`) : undefined,
      roleCode ? like(rolesTable.roleCode, `%${roleCode}%`) : undefined,
      status !== undefined ? eq(rolesTable.status, status) : undefined,
    );

    const result = await paginate(rolesTable, { page, pageSize }, where);

    return {
      ...result,
      list: result.list.map(toRoleVO),
    };
  }
  /**
   * 获取角色
   */
  async getRoleById(id: string) {
    const role = await this.getExistingRoleById(id);
    return toRoleVO(role);
  }
  /**
   * 给角色绑定权限
   */
  async addRolePermissions(
    id: string,
    dto: PermissionIdsDTO,
  ): Promise<{ roleId: string; permissionIds: string[] }> {
    await this.getExistingRoleById(id);
    await this.ensurePermissionsExist(dto.permissionIds);

    const existingRows = await db
      .select({ permissionId: rolePermissionTable.permissionId })
      .from(rolePermissionTable)
      .where(
        and(
          eq(rolePermissionTable.roleId, id),
          inArray(rolePermissionTable.permissionId, dto.permissionIds),
        ),
      );
    const existingPermissionIds = new Set(
      existingRows.map((row) => row.permissionId),
    );
    const permissionIdsToInsert = dto.permissionIds.filter(
      (permissionId) => !existingPermissionIds.has(permissionId),
    );

    if (permissionIdsToInsert.length > 0) {
      await db.insert(rolePermissionTable).values(
        permissionIdsToInsert.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
      );
    }

    return { roleId: id, permissionIds: dto.permissionIds };
  }
  /**
   * 解绑角色权限
   */
  async deleteRolePermissions(
    id: string,
    dto: PermissionIdsDTO,
  ): Promise<{ roleId: string; permissionIds: string[] }> {
    await this.getExistingRoleById(id);
    await this.ensurePermissionsExist(dto.permissionIds);

    await db
      .delete(rolePermissionTable)
      .where(
        and(
          eq(rolePermissionTable.roleId, id),
          inArray(rolePermissionTable.permissionId, dto.permissionIds),
        ),
      );

    return { roleId: id, permissionIds: dto.permissionIds };
  }
  /**
   * 给角色绑定菜单
   */
  async addRoleMenus(
    id: string,
    dto: MenuIdsDTO,
  ): Promise<{ roleId: string; menuIds: string[] }> {
    await this.getExistingRoleById(id);
    await this.ensureMenusExist(dto.menuIds);

    const existingRows = await db
      .select({ menuId: roleMenuTable.menuId })
      .from(roleMenuTable)
      .where(
        and(
          eq(roleMenuTable.roleId, id),
          inArray(roleMenuTable.menuId, dto.menuIds),
        ),
      );
    const existingMenuIds = new Set(existingRows.map((row) => row.menuId));
    const menuIdsToInsert = dto.menuIds.filter(
      (menuId) => !existingMenuIds.has(menuId),
    );

    if (menuIdsToInsert.length > 0) {
      await db.insert(roleMenuTable).values(
        menuIdsToInsert.map((menuId) => ({
          roleId: id,
          menuId,
        })),
      );
    }

    return { roleId: id, menuIds: dto.menuIds };
  }
  /**
   * 解绑角色菜单
   */
  async deleteRoleMenus(
    id: string,
    dto: MenuIdsDTO,
  ): Promise<{ roleId: string; menuIds: string[] }> {
    await this.getExistingRoleById(id);
    await this.ensureMenusExist(dto.menuIds);

    await db
      .delete(roleMenuTable)
      .where(
        and(
          eq(roleMenuTable.roleId, id),
          inArray(roleMenuTable.menuId, dto.menuIds),
        ),
      );

    return { roleId: id, menuIds: dto.menuIds };
  }
  /**
   * 验证角色是否存在
   */
  async getExistingRoleById(id: string) {
    const rows = await db
      .select()
      .from(rolesTable)
      .where(and(notDeleted(rolesTable), eq(rolesTable.id, id)))
      .limit(1);
    if (rows.length === 0) {
      throw new HTTPException(HTTP_STATUS.NOT_FOUND, {
        message: "角色不存在",
      });
    }
    return rows[0];
  }
  /**
   * 验证角色是否启用
   */
  async getActiveRoleById(id: string) {
    const role = await this.getExistingRoleById(id);
    if (role.status === 0) {
      throw new HTTPException(HTTP_STATUS.FORBIDDEN, {
        message: "角色已禁用",
      });
    }
    return role;
  }

  private async ensurePermissionsExist(permissionIds: string[]) {
    const rows = await db
      .select({ id: permissionsTable.id })
      .from(permissionsTable)
      .where(
        and(
          notDeleted(permissionsTable),
          inArray(permissionsTable.id, permissionIds),
        ),
      );
    if (rows.length !== permissionIds.length) {
      throw new HTTPException(HTTP_STATUS.NOT_FOUND, {
        message: "权限不存在",
      });
    }
  }

  private async ensureMenusExist(menuIds: string[]) {
    const rows = await db
      .select({ id: menusTable.id })
      .from(menusTable)
      .where(and(notDeleted(menusTable), inArray(menusTable.id, menuIds)));
    if (rows.length !== menuIds.length) {
      throw new HTTPException(HTTP_STATUS.NOT_FOUND, {
        message: "菜单不存在",
      });
    }
  }
}

export default new RoleService();
