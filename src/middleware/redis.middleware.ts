import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types/hono.js";
import redis from "../redis.js";

/**
 * Redis 缓存中间件 - 将全局单例客户端注入到请求上下文
 */
export const redisMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  c.set("redis", redis);
  await next();
});
