import { Hono } from "hono";
import type { Redis } from "ioredis";
import { zValidator } from "../middleware/validator.middleware.js";
import permissionsService from "../service/permissions.service.js";
import {
  createPermissionSchema,
  permissionQuerySchema,
  updatePermissionSchema,
} from "../dto/permissions.dto.js";
import { ok } from "../utils/response.js";
import { jwtAuth } from "../middleware/jwtAuth.middleware.js";
import { roleAuth } from "../middleware/roleAuth.middleware.js";
import { idSchema } from "../dto/common.dto.js";

const permissionsController = new Hono();

const PERMISSIONS_CACHE_PATTERN = "permissions:roles:*";

const clearPermissionsCache = async (redis: Redis) => {
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      PERMISSIONS_CACHE_PATTERN,
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
 * 创建权限
 */
permissionsController.post(
  "/",
  jwtAuth,
  roleAuth,
  zValidator("json", createPermissionSchema),
  async (c) => {
    const permission = c.req.valid("json");
    const result = await permissionsService.addPermission(permission);
    return ok(c, result);
  },
);
/**
 * 删除权限
 */
permissionsController.delete(
  "/:id",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await permissionsService.deletePermission(id);
    await clearPermissionsCache(c.get("redis"));
    return ok(c, result);
  },
);
/**
 * 更新权限
 */
permissionsController.put(
  "/:id",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  zValidator("json", updatePermissionSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const dto = c.req.valid("json");
    const result = await permissionsService.updatePermission(id, dto);
    await clearPermissionsCache(c.get("redis"));
    return ok(c, result);
  },
);
/**
 * 获取权限列表
 */
permissionsController.get(
  "/",
  jwtAuth,
  roleAuth,
  zValidator("query", permissionQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const result = await permissionsService.getPermissions(query);
    return ok(c, result);
  },
);

/**
 * 获取单个权限
 */
permissionsController.get(
  "/:id",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const permission = await permissionsService.getPermissionById(id);
    return ok(c, permission);
  },
);

export default permissionsController;
