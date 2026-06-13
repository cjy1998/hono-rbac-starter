import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv, UserPayload } from "../types/hono.js";
import { HTTP_STATUS } from "./const.js";

/**
 * 从请求上下文中取出已登录用户。
 * jwtAuth 中间件会写入 user，但其类型为可选（部分路由不鉴权），统一做类型收窄 + 兜底，避免每个受保护路由重复判断。
 */
export const requireUser = (c: Context<AppEnv>): UserPayload => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(HTTP_STATUS.UNAUTHORIZED, { message: "未登录" });
  }
  return user;
};
