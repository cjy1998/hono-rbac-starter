import { Hono } from "hono";
import type { Redis } from "ioredis";
import { zValidator } from "../middleware/validator.middleware.js";
import userService from "../service/user.service.js";
import {
  createUserSchema,
  loginSchema,
  updatePasswordSchema,
  updateUserSchema,
  userQuerySchema,
} from "../dto/user.dto.js";
import { fail, ok } from "../utils/response.js";
import { jwtAuth } from "../middleware/jwtAuth.middleware.js";
import { roleAuth } from "../middleware/roleAuth.middleware.js";
import { idSchema } from "../dto/common.dto.js";

const userController = new Hono();

const clearUserCache = async (redis: Redis, id: string) => {
  await redis.del(`user:${id}`, `user:roles:${id}`);
};
/**
 * 创建用户
 */
userController.post(
  "/",
  jwtAuth,
  zValidator("json", createUserSchema),
  async (c) => {
    const user = c.req.valid("json");
    const result = await userService.createUser(user);
    return ok(c, result);
  },
);
/**
 * 删除用户
 */
userController.delete(
  "/:id",
  jwtAuth,
  zValidator("param", idSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const result = await userService.deleteUser(id);
    await clearUserCache(c.get("redis"), id);
    return ok(c, result);
  },
);
/**
 * 更新用户
 */
userController.put(
  "/:id",
  jwtAuth,
  zValidator("param", idSchema),
  zValidator("json", updateUserSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const dto = c.req.valid("json");
    const result = await userService.updateUser(id, dto);
    await clearUserCache(c.get("redis"), id);
    return ok(c, result);
  },
);
/**
 * 获取用户列表
 */
userController.get(
  "/",
  jwtAuth,
  roleAuth,
  zValidator("query", userQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const result = await userService.getUsers(query);
    return ok(c, result);
  },
);

/**
 * 获取单个用户
 */
userController.get(
  "/:id",
  jwtAuth,
  zValidator("param", idSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const redis = c.get("redis");
    const cacheKey = `user:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return ok(c, JSON.parse(cached));
    }
    const user = await userService.getUserById(id);
    await redis.set(cacheKey, JSON.stringify(user), "EX", 3600);
    return ok(c, user);
  },
);
/**
 * 修改密码
 */
userController.put(
  "/:id/password",
  jwtAuth,
  zValidator("param", idSchema),
  zValidator("json", updatePasswordSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const dto = c.req.valid("json");
    const result = await userService.updatePassword(id, dto);
    await clearUserCache(c.get("redis"), id);
    return ok(c, result);
  },
);
/**
 * 登录 - 返回用户信息（含角色）+ token
 */
userController.post("/login", zValidator("json", loginSchema), async (c) => {
  const dto = c.req.valid("json");
  const result = await userService.login(dto);
  if (!result.success) {
    return fail(c, result.errorCode, result.message);
  }
  return ok(c, { user: result.user, token: result.token });
});

export default userController;
