import { Hono } from "hono";
import type { Redis } from "ioredis";
import { zValidator } from "../middleware/validator.middleware.js";
import roleService from "../service/role.service.js";
import {
  createRoleSchema,
  updateRoleSchema,
  roleQuerySchema,
} from "../dto/role.dto.js";
import { ok } from "../utils/response.js";
import { jwtAuth } from "../middleware/jwtAuth.middleware.js";
import { roleAuth } from "../middleware/roleAuth.middleware.js";
import {
  idSchema,
  menuIdsSchema,
  permissionIdsSchema,
} from "../dto/common.dto.js";

const roleController = new Hono();

const clearUsersCache = async (redis: Redis, userIds: string[]) => {
  if (userIds.length === 0) return;
  const keys = userIds.flatMap((userId) => [
    `user:${userId}`,
    `user:roles:${userId}`,
  ]);
  await redis.del(...keys);
};

const clearPermissionsCache = async (redis: Redis) => {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      "permissions:roles:*",
      "COUNT",
      100,
    );
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
};
/**
 * 创建角色
 */
roleController.post(
  "/",
  jwtAuth,
  roleAuth,
  zValidator("json", createRoleSchema),
  async (c) => {
    const role = c.req.valid("json");
    const result = await roleService.createRole(role);
    return ok(c, result);
  },
);
/**
 * 删除角色
 */
roleController.delete(
  "/:id",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const affectedUserIds = await roleService.getUserIdsByRoleId(id);
    const result = await roleService.deleteRole(id);
    await clearUsersCache(c.get("redis"), affectedUserIds);
    return ok(c, result);
  },
);
/**
 * 更新角色
 */
roleController.put(
  "/:id",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  zValidator("json", updateRoleSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const dto = c.req.valid("json");
    const affectedUserIds = await roleService.getUserIdsByRoleId(id);
    const result = await roleService.updateRole(id, dto);
    await clearUsersCache(c.get("redis"), affectedUserIds);
    return ok(c, result);
  },
);
/**
 * 绑定角色权限
 */
roleController.post(
  "/:id/permissions",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  zValidator("json", permissionIdsSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const dto = c.req.valid("json");
    const result = await roleService.addRolePermissions(id, dto);
    await clearPermissionsCache(c.get("redis"));
    return ok(c, result);
  },
);
/**
 * 解绑角色权限
 */
roleController.delete(
  "/:id/permissions",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  zValidator("json", permissionIdsSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const dto = c.req.valid("json");
    const result = await roleService.deleteRolePermissions(id, dto);
    await clearPermissionsCache(c.get("redis"));
    return ok(c, result);
  },
);
/**
 * 绑定角色菜单
 */
roleController.post(
  "/:id/menus",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  zValidator("json", menuIdsSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const dto = c.req.valid("json");
    const result = await roleService.addRoleMenus(id, dto);
    return ok(c, result);
  },
);
/**
 * 解绑角色菜单
 */
roleController.delete(
  "/:id/menus",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  zValidator("json", menuIdsSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const dto = c.req.valid("json");
    const result = await roleService.deleteRoleMenus(id, dto);
    return ok(c, result);
  },
);
/**
 * 获取角色列表
 */
roleController.get(
  "/",
  jwtAuth,
  roleAuth,
  zValidator("query", roleQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const result = await roleService.getRoles(query);
    return ok(c, result);
  },
);

/**
 * 获取单个角色
 */
roleController.get(
  "/:id",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const role = await roleService.getRoleById(id);
    return ok(c, role);
  },
);

export default roleController;
