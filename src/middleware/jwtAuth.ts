import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";
import { HTTP_STATUS } from "../utils/const.js";
import {
  JwtTokenExpired,
  JwtTokenInvalid,
  JwtTokenSignatureMismatched,
} from "hono/utils/jwt/types";

export const jwtAuth = createMiddleware(async (c, next) => {
  const token = c.req.header("Authorization")?.split(" ")[1];
  if (!token) {
    throw new HTTPException(HTTP_STATUS.UNAUTHORIZED, {
      message: "token is required",
    });
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new HTTPException(HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      message: "JWT_SECRET is not configured",
    });
  }
  try {
    const payload = await verify(token, secret, "HS256");
    c.set("user", payload);
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
