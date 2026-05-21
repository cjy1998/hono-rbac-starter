import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "../middleware/validator.js";
import userService from "../service/user.js";
import {
  createUserSchema,
  loginSchema,
  userIdParamSchema,
  userQuerySchema,
} from "../dto/user.dto.js";
import { toUserVO } from "../vo/user.vo.js";
import { fail, ok } from "../utils/response.js";
import argon2 from "argon2";
import { jwtAuth } from "../middleware/jwtAuth.js";
import { roleAuth } from "../middleware/roleAuth.js";

const userController = new Hono();

userController.get(
  "/",
  jwtAuth,
  roleAuth,
  zValidator("query", userQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const users = await userService.getUsers(query);
    return ok(c, users.map(toUserVO));
  },
);

userController.get(
  "/:id",
  jwtAuth,
  zValidator("param", userIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const redis = c.get("redis");
    const cacheKey = `user:${id}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      return ok(c, JSON.parse(cached));
    }

    const user = await userService.getUserById(id);
    if (!user) {
      throw new HTTPException(404, { message: "用户不存在" });
    }

    const userVO = toUserVO(user);
    await redis.set(cacheKey, JSON.stringify(userVO), "EX", 3600);
    return ok(c, userVO);
  },
);

userController.post(
  "/",
  jwtAuth,
  zValidator("json", createUserSchema),
  async (c) => {
    const dto = c.req.valid("json");
    const storageHash = await argon2.hash(dto.password);
    const newUser = { ...dto, password: storageHash };
    const result = await userService.createUser(newUser);
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
