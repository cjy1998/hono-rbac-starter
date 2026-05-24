/**
 * Hono 应用级别的类型声明
 * ----------------------------------------------------------------
 * 通过给 new Hono<AppEnv>() 传入泛型，可以让 c.set / c.get / c.var
 * 拥有强类型，避免出现 "类型 string 的参数不能赋给类型 never" 的报错。
 */

import type { Redis } from "ioredis";

/** JWT payload 中存储的用户信息 */
export type UserPayload = {
  id: string;
  username: string;
  email: string;
  exp: number;
};

export type AppEnv = {
  Variables: {
    /** 每个请求的唯一标识，由 requestLogger 中间件写入 */
    requestId: string;
    /** JWT 解析出来的 payload，由 jwtAuth 中间件写入 */
    user?: UserPayload;
    /** 当前请求携带的 Bearer token，由 jwtAuth 中间件写入 */
    token?: string;
    /** Redis 客户端，由 redisMiddleware 中间件写入 */
    redis: Redis;
  };
};
