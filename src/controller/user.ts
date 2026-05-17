import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "../middleware/validator.js";
import userServer from "../server/user.js";
import {
  createUserSchema,
  loginSchema,
  userIdParamSchema,
  userQuerySchema,
} from "../dto/user.dto.js";
import { toUserVO } from "../vo/user.vo.js";
import { fail, ok } from "../utils/response.js";
import argon2 from "argon2";
import { HTTP_STATUS } from "../utils/const.js";
import { sign } from "hono/jwt";
import { jwtAuth } from "../middleware/jwtAuth.js";

const userController = new Hono();

userController.get(
  "/",
  jwtAuth,
  zValidator("query", userQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const users = await userServer.getUsers(query);
    return ok(c, users.map(toUserVO));
  },
);

userController.get(
  "/:id",
  jwtAuth,
  zValidator("param", userIdParamSchema),
  async (c) => {
    const { id } = c.req.valid("param");
    const user = await userServer.getUserById(id);
    if (!user) {
      throw new HTTPException(404, { message: "用户不存在" });
    }
    return ok(c, toUserVO(user));
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
    const result = await userServer.createUser(newUser);
    return ok(c, result);
  },
);
/**
 * 登录
 */
userController.post("/login", zValidator("json", loginSchema), async (c) => {
  const dto = c.req.valid("json");
  const user = await userServer.getUserByEmail(dto.email);
  if (!user) {
    return fail(c, HTTP_STATUS.NOT_FOUND, "用户不存在");
  }
  const isPasswordValid = await argon2.verify(user.password, dto.password);
  if (!isPasswordValid) {
    return fail(c, HTTP_STATUS.UNAUTHORIZED, "密码不正确");
  }
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24小时后过期
  };
  const jwtSecret = process.env.JWT_SECRET;
  const token = await sign(payload, jwtSecret as string);
  return ok(c, { user: toUserVO(user), token });
});
export default userController;
