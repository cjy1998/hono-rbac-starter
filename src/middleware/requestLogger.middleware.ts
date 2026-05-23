/**
 * 请求日志中间件
 */
import { createMiddleware } from "hono/factory";
import { randomUUID } from "node:crypto";
import type { AppEnv } from "../types/hono.js";
import { logger } from "../utils/logger.js";

export const requestLogger = createMiddleware<AppEnv>(async (c, next) => {
  // 优先使用传入的 request id（例如经过网关时由网关注入），
  const requestId = c.req.header("x-request-id") ?? randomUUID();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);

  const start = Date.now();
  const { method } = c.req;
  const url = new URL(c.req.url);
  const path = url.pathname;
  const userAgent = c.req.header("user-agent");
  // 经过反向代理（Nginx / 网关）后，真实客户端 IP 通常在 x-forwarded-for 第一个
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "";

  logger.info("request received", {
    requestId,
    method,
    path,
    query: url.search,
    userAgent,
    ip,
  });

  try {
    await next();
  } finally {
    // 无论成功还是异常，都要打一条「completed」日志，便于统计 P95 耗时
    const durationMs = Date.now() - start;
    const status = c.res.status;
    // 根据状态码动态选择日志级别：5xx -> error，4xx -> warn，其余 -> info
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    logger.log(level, "request completed", {
      requestId,
      method,
      path,
      status,
      durationMs,
    });
  }
});
