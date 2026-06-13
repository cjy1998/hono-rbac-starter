import { and, asc, eq, inArray, like } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../db/index.js";
import { menusTable } from "../db/schema/menus.js";
import { roleMenuTable } from "../db/schema/role_menu.js";
import { userRoleTable } from "../db/schema/user_role.js";
import type {
  CreateMenuDTO,
  MenuQueryDTO,
  MenuTreeQueryDTO,
  UpdateMenuDTO,
} from "../dto/menu.dto.js";
import { HTTP_STATUS } from "../utils/const.js";
import { notDeleted, paginate } from "../utils/query.js";
import {
  toMenuVO,
  type MenuListVO,
  type MenuTreeVO,
  type MenuVO,
} from "../vo/menu.vo.js";

const SUPER_ADMIN_CODE = "super_admin";

class MenuService {
  /**
   * 创建菜单
   */
  async createMenu(menu: CreateMenuDTO): Promise<MenuVO> {
    await this.ensureParentMenuExists(menu.parentId);

    const result = await db.insert(menusTable).values(menu).$returningId();
    const resultMenu = await this.getExistingMenuById(result[0].id);
    return toMenuVO(resultMenu);
  }

  /**
   * 删除菜单
   */
  async deleteMenu(id: string): Promise<{ id: string }> {
    await this.getExistingMenuById(id);
    const children = await db
      .select({ id: menusTable.id })
      .from(menusTable)
      .where(and(notDeleted(menusTable), eq(menusTable.parentId, id)))
      .limit(1);

    if (children.length > 0) {
      throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
        message: "存在子菜单，无法删除",
      });
    }

    await db
      .update(menusTable)
      .set({ deletedAt: new Date() })
      .where(and(notDeleted(menusTable), eq(menusTable.id, id)));
    return { id };
  }

  /**
   * 更新菜单
   */
  async updateMenu(id: string, menu: UpdateMenuDTO): Promise<MenuVO> {
    await this.getExistingMenuById(id);
    if (menu.parentId !== undefined) {
      if (menu.parentId === id) {
        throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
          message: "父菜单不能是当前菜单",
        });
      }
      await this.ensureParentMenuExists(menu.parentId);
      await this.ensureNotDescendant(id, menu.parentId);
    }

    if (Object.keys(menu).length > 0) {
      await db
        .update(menusTable)
        .set(menu)
        .where(and(notDeleted(menusTable), eq(menusTable.id, id)));
    }

    const newMenu = await this.getExistingMenuById(id);
    return toMenuVO(newMenu);
  }

  /**
   * 获取菜单列表
   */
  async getMenus(query: MenuQueryDTO): Promise<MenuListVO> {
    const { page, pageSize } = query;
    const where = this.buildMenuWhere(query);
    const result = await paginate(menusTable, { page, pageSize }, where);

    return {
      ...result,
      list: result.list.map(toMenuVO),
    };
  }

  /**
   * 获取菜单树
   */
  async getMenuTree(query: MenuTreeQueryDTO): Promise<MenuTreeVO[]> {
    const rows = await db
      .select()
      .from(menusTable)
      .where(this.buildMenuWhere(query))
      .orderBy(asc(menusTable.sortOrder), asc(menusTable.createdAt));

    return this.buildTree(
      rows.map((row) => ({ ...toMenuVO(row), children: [] })),
    );
  }

  /**
   * 获取当前登录用户可见的菜单树
   * - 超级管理员：返回全部启用菜单
   * - 其他角色：仅返回其角色经 role_menu 关联的启用菜单
   * - 无任何角色：返回空数组
   */
  async getUserMenuTree(userId: string): Promise<MenuTreeVO[]> {
    const userRoles = await db.query.userRoleTable.findMany({
      where: eq(userRoleTable.userId, userId),
      with: { role: true },
    });

    const roleIds = userRoles.map((ur) => ur.roleId);
    const isSuperAdmin = userRoles.some(
      (ur) => ur.role.roleCode === SUPER_ADMIN_CODE,
    );

    if (isSuperAdmin) {
      const rows = await db
        .select()
        .from(menusTable)
        .where(and(notDeleted(menusTable), eq(menusTable.status, 1)))
        .orderBy(asc(menusTable.sortOrder), asc(menusTable.createdAt));
      return this.buildTree(
        rows.map((row) => ({ ...toMenuVO(row), children: [] })),
      );
    }

    if (roleIds.length === 0) return [];

    const rows = await db
      .select({ menu: menusTable })
      .from(roleMenuTable)
      .innerJoin(menusTable, eq(roleMenuTable.menuId, menusTable.id))
      .where(
        and(
          inArray(roleMenuTable.roleId, roleIds),
          notDeleted(menusTable),
          eq(menusTable.status, 1),
        ),
      )
      .orderBy(asc(menusTable.sortOrder), asc(menusTable.createdAt));

    // 多角色可能关联同一菜单，按 id 去重
    const seen = new Set<string>();
    const unique: MenuTreeVO[] = [];
    for (const { menu } of rows) {
      if (seen.has(menu.id)) continue;
      seen.add(menu.id);
      unique.push({ ...toMenuVO(menu), children: [] });
    }

    return this.buildTree(unique);
  }

  /**
   * 获取菜单详情
   */
  async getMenuById(id: string): Promise<MenuVO> {
    const menu = await this.getExistingMenuById(id);
    return toMenuVO(menu);
  }

  /**
   * 验证菜单是否存在
   */
  async getExistingMenuById(id: string) {
    const rows = await db
      .select()
      .from(menusTable)
      .where(and(notDeleted(menusTable), eq(menusTable.id, id)))
      .limit(1);
    if (rows.length === 0) {
      throw new HTTPException(HTTP_STATUS.NOT_FOUND, {
        message: "菜单不存在",
      });
    }
    return rows[0];
  }

  private buildMenuWhere(query: MenuTreeQueryDTO) {
    const { parentId, menuName, menuType, path, visible, status } = query;
    return and(
      notDeleted(menusTable),
      parentId !== undefined ? eq(menusTable.parentId, parentId) : undefined,
      menuName ? like(menusTable.menuName, `%${menuName}%`) : undefined,
      menuType !== undefined ? eq(menusTable.menuType, menuType) : undefined,
      path ? like(menusTable.path, `%${path}%`) : undefined,
      visible !== undefined ? eq(menusTable.visible, visible) : undefined,
      status !== undefined ? eq(menusTable.status, status) : undefined,
    );
  }

  private async ensureParentMenuExists(parentId: string) {
    if (parentId === "0") return;
    await this.getExistingMenuById(parentId);
  }

  private async ensureNotDescendant(id: string, parentId: string) {
    if (parentId === "0") return;

    let currentParentId = parentId;
    while (currentParentId !== "0") {
      if (currentParentId === id) {
        throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
          message: "父菜单不能是当前菜单的子菜单",
        });
      }
      const parent = await this.getExistingMenuById(currentParentId);
      currentParentId = parent.parentId;
    }
  }

  private buildTree(menus: MenuTreeVO[]): MenuTreeVO[] {
    const menuMap = new Map<string, MenuTreeVO>();
    const roots: MenuTreeVO[] = [];

    for (const menu of menus) {
      menuMap.set(menu.id, menu);
    }

    for (const menu of menus) {
      const parent = menuMap.get(menu.parentId);
      if (menu.parentId !== "0" && parent) {
        parent.children.push(menu);
      } else {
        roots.push(menu);
      }
    }

    return roots;
  }
}

export default new MenuService();
