import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";
import { HTTP_STATUS } from "../utils/const.js";
import {
  JwtTokenExpired,
  JwtTokenInvalid,
  JwtTokenSignatureMismatched,
} from "hono/utils/jwt/types";
import { env } from "../env.js";
import type { AppEnv, UserPayload } from "../types/hono.js";

/**
 * JWT 鉴权中间件
 */
export const jwtAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) {
    throw new HTTPException(HTTP_STATUS.UNAUTHORIZED, {
      message: "token is required",
    });
  }

  try {
    const payload = await verify(token, env.JWT_SECRET, "HS256");
    // 只取我们需要的字段存入 context，避免 JWT 中被篡改的额外字段泄漏
    const user: UserPayload = {
      id: payload.id as string,
      username: payload.username as string,
      email: payload.email as string,
      exp: payload.exp as number,
    };
    c.set("user", user);
  } catch (err) {
    if (err instanceof JwtTokenExpired) {
      throw new HTTPException(HTTP_STATUS.UNAUTHORIZED, {
        message: "token 已过期",
      });
    }
    if (
      err instanceof JwtTokenInvalid ||
      err instanceof JwtTokenSignatureMismatched
    ) {
      throw new HTTPException(HTTP_STATUS.UNAUTHORIZED, {
        message: "token 无效",
      });
    }
    throw new HTTPException(HTTP_STATUS.UNAUTHORIZED, { message: "鉴权失败" });
  }
  await next();
});