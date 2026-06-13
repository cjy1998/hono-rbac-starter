import { Hono } from "hono";
import { idSchema } from "../dto/common.dto.js";
import {
  createMenuSchema,
  menuQuerySchema,
  menuTreeQuerySchema,
  updateMenuSchema,
} from "../dto/menu.dto.js";
import { jwtAuth } from "../middleware/jwtAuth.middleware.js";
import { roleAuth } from "../middleware/roleAuth.middleware.js";
import { zValidator } from "../middleware/validator.middleware.js";
import menuService from "../service/menu.service.js";
import { ok } from "../utils/response.js";
import { requireUser } from "../utils/auth.js";

const menuController = new Hono();

/**
 * 创建菜单
 */
menuController.post(
  "/",
  jwtAuth,
  roleAuth,
  zValidator("json", createMenuSchema),
  async (c) => {
    const menu = c.req.valid("json");
    const result = await menuService.createMenu(menu);
    return ok(c, result);
  },
);

/**
 * 获取菜单树
 */
menuController.get(
  "/tree",
  jwtAuth,
  roleAuth,
  zValidator("query", menuTreeQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const result = await menuService.getMenuTree(query);
    return ok(c, result);
  },
);

/**
 * 获取当前登录用户可见的菜单树（按角色过滤，仅需登录）
 */
menuController.get("/mine", jwtAuth, async (c) => {
  const user = requireUser(c);
  const result = await menuService.getUserMenuTree(user.id);
  return ok(c, result);
});

/**
 * 获取菜单列表
 */
menuController.get(
  "/",
  jwtAuth,
  roleAuth,
  zValidator("query", menuQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const result = await menuService.getMenus(query);
    return ok(c, result);
  },
);

/**
 * 获取单个菜单
 */
menuController.get(
  "/:id",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const menu = await menuService.getMenuById(id);
    return ok(c, menu);
  },
);

/**
 * 更新菜单
 */
menuController.put(
  "/:id",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  zValidator("json", updateMenuSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const dto = c.req.valid("json");
    const result = await menuService.updateMenu(id, dto);
    return ok(c, result);
  },
);

/**
 * 删除菜单
 */
menuController.delete(
  "/:id",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await menuService.deleteMenu(id);
    return ok(c, result);
  },
);

export default menuController;
