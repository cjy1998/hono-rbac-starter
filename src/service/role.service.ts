import { and, eq, like, ne } from "drizzle-orm";
import db from "../db/index.js";
import { rolesTable } from "../db/schema/roles.js";
import { notDeleted, paginate } from "../utils/query.js";
import type {
  CreateRoleDTO,
  UpdateRoleDTO,
  RoleQueryDTO,
} from "../dto/role.dto.js";
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
}

export default new RoleService();
