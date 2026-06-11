import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { HTTP_STATUS } from "../utils/const.js";
import type { AppEnv } from "../types/hono.js";
import type { Context } from "hono";

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
  message?: string;
};

const getClientIp = (c: Context<AppEnv>) => {
  const forwardedFor = c.req.header("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return (
    c.req.header("x-real-ip") ||
    c.req.header("cf-connecting-ip") ||
    "unknown"
  );
};

/**
 * 基于 Redis ZSet 的滑动窗口限流中间件
 */
export const createRateLimit = (options: RateLimitOptions) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const now = Date.now();
    const windowStart = now - options.windowMs;
    const identifier = getClientIp(c);
    const key = `rate_limit:${options.keyPrefix}:${identifier}`;
    const redis = c.get("redis");

    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);

    c.header("X-RateLimit-Limit", String(options.limit));
    c.header("X-RateLimit-Remaining", String(Math.max(options.limit - count, 0)));

    if (count >= options.limit) {
      c.header("Retry-After", String(Math.ceil(options.windowMs / 1000)));
      throw new HTTPException(HTTP_STATUS.TOO_MANY_REQUESTS, {
        message: options.message ?? "请求过于频繁，请稍后重试",
      });
    }

    await redis.zadd(key, now, `${now}:${Math.random()}`);
    await redis.pexpire(key, options.windowMs);

    await next();
  });
