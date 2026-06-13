import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
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
import { idSchema, roleIdsSchema } from "../dto/common.dto.js";
import {
  getTokenBlacklistKey,
  getTokenTtl,
  getTokenVersionKey,
} from "../utils/token.js";
import { createRateLimit } from "../middleware/rateLimit.middleware.js";
import { env } from "../env.js";
import { HTTP_STATUS } from "../utils/const.js";
import { CACHE_NULL_VALUE, getTtlWithJitter } from "../utils/cache.js";
import type { AppEnv } from "../types/hono.js";
import { requireUser } from "../utils/auth.js";

const userController = new Hono();

const clearUserCache = async (redis: Redis, id: string) => {
  await redis.del(`user:${id}`, `user:roles:${id}`, getTokenVersionKey(id));
};

const loginRateLimit = createRateLimit({
  keyPrefix: "login",
  limit: env.RATE_LIMIT_LOGIN_MAX,
  windowMs: env.RATE_LIMIT_LOGIN_WINDOW_SEC * 1000,
  message: "登录过于频繁，请稍后再试",
});
const USER_CACHE_TTL = 3600;
const USER_CACHE_NULL_TTL = 60;

const assertPrivilegedOperator = async (c: Context<AppEnv>) => {
  const operator = requireUser(c);
  const isPrivileged = await userService.isPrivilegedUser(operator.id);
  if (!isPrivileged) {
    throw new HTTPException(HTTP_STATUS.FORBIDDEN, {
      message: "没有权限执行该操作",
    });
  }
  return operator;
};

const assertSelfOrPrivilegedOperator = async (
  c: Context<AppEnv>,
  targetUserId: string,
) => {
  const operator = requireUser(c);
  if (operator.id === targetUserId) {
    return { operator, isSelf: true, isPrivileged: false };
  }
  const isPrivileged = await userService.isPrivilegedUser(operator.id);
  if (!isPrivileged) {
    throw new HTTPException(HTTP_STATUS.FORBIDDEN, {
      message: "只能操作自己的账号",
    });
  }
  return { operator, isSelf: false, isPrivileged: true };
};
/**
 * 创建用户
 */
userController.post(
  "/",
  jwtAuth,
  roleAuth,
  zValidator("json", createUserSchema),
  async (c) => {
    await assertPrivilegedOperator(c);
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
  roleAuth,
  zValidator("param", idSchema),
  async (c) => {
    await assertPrivilegedOperator(c);
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
  roleAuth,
  zValidator("param", idSchema),
  zValidator("json", updateUserSchema),
  async (c) => {
    await assertPrivilegedOperator(c);
    const { id } = c.req.valid("param");
    const dto = c.req.valid("json");
    const result = await userService.updateUser(id, dto);
    await clearUserCache(c.get("redis"), id);
    return ok(c, result);
  },
);
/**
 * 绑定用户角色
 */
userController.post(
  "/:id/roles",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  zValidator("json", roleIdsSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const dto = c.req.valid("json");
    const result = await userService.addUserRoles(id, dto);
    await clearUserCache(c.get("redis"), id);
    return ok(c, result);
  },
);
/**
 * 解绑用户角色
 */
userController.delete(
  "/:id/roles",
  jwtAuth,
  roleAuth,
  zValidator("param", idSchema),
  zValidator("json", roleIdsSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const dto = c.req.valid("json");
    const result = await userService.deleteUserRoles(id, dto);
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
    await assertSelfOrPrivilegedOperator(c, id);
    const redis = c.get("redis");
    const cacheKey = `user:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      if (cached === CACHE_NULL_VALUE) {
        throw new HTTPException(HTTP_STATUS.NOT_FOUND, {
          message: "用户不存在",
        });
      }
      return ok(c, JSON.parse(cached));
    }
    try {
      const user = await userService.getUserById(id);
      await redis.set(
        cacheKey,
        JSON.stringify(user),
        "EX",
        getTtlWithJitter(USER_CACHE_TTL),
      );
      return ok(c, user);
    } catch (err) {
      if (err instanceof HTTPException && err.status === HTTP_STATUS.NOT_FOUND) {
        await redis.set(
          cacheKey,
          CACHE_NULL_VALUE,
          "EX",
          getTtlWithJitter(USER_CACHE_NULL_TTL, 15),
        );
      }
      throw err;
    }
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
    const { isSelf } = await assertSelfOrPrivilegedOperator(c, id);
    if (isSelf && !dto.oldPassword) {
      throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
        message: "修改自己的密码时必须提供旧密码",
      });
    }
    const result = await userService.updatePassword(id, dto);
    await clearUserCache(c.get("redis"), id);
    return ok(c, result);
  },
);
/**
 * 登录 - 返回用户信息（含角色）+ token
 */
userController.post(
  "/login",
  loginRateLimit,
  zValidator("json", loginSchema),
  async (c) => {
    const dto = c.req.valid("json");
    const result = await userService.login(dto);
    if (!result.success) {
      return fail(c, result.errorCode, result.message);
    }
    return ok(c, { user: result.user, token: result.token });
  },
);

/**
 * 登出 - 将当前 token 加入 Redis 黑名单
 */
userController.post("/logout", jwtAuth, async (c) => {
  const token = c.get("token");
  const user = c.get("user");
  if (token && user) {
    // 只按 token 剩余有效期拉黑，避免 Redis 中残留已自然过期的 token。
    const ttl = getTokenTtl(user.exp);
    if (ttl > 0) {
      await c.get("redis").set(getTokenBlacklistKey(token), "1", "EX", ttl);
    }
  }
  return ok(c, null);
});

/**
 * 全端登出 - 递增 tokenVersion，使当前用户已签发的所有 token 立即失效
 */
userController.post("/logout-all", jwtAuth, async (c) => {
  const user = requireUser(c);
  const result = await userService.invalidateAllSessions(user.id);
  await clearUserCache(c.get("redis"), user.id);
  return ok(c, result);
});

export default userController;
