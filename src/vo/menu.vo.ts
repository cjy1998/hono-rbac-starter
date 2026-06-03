import type { menusTable } from "../db/schema/menus.js";
import type { PaginatedVO } from "./common.vo.js";

type MenuPO = typeof menusTable.$inferSelect;

export interface MenuVO {
  id: string;
  parentId: string;
  menuName: string;
  menuType: number;
  path: string;
  component: string;
  icon: string;
  redirect: string;
  permissionCode: string;
  visible: number;
  keepAlive: number;
  sortOrder: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuTreeVO extends MenuVO {
  children: MenuTreeVO[];
}

export const toMenuVO = (menu: MenuPO): MenuVO => ({
  id: menu.id,
  parentId: menu.parentId,
  menuName: menu.menuName,
  menuType: menu.menuType,
  path: menu.path,
  component: menu.component,
  icon: menu.icon,
  redirect: menu.redirect,
  permissionCode: menu.permissionCode,
  visible: menu.visible,
  keepAlive: menu.keepAlive,
  sortOrder: menu.sortOrder,
  status: menu.status,
  createdAt: menu.createdAt.toISOString(),
  updatedAt: menu.updatedAt.toISOString(),
});

export type MenuListVO = PaginatedVO<MenuVO>;
