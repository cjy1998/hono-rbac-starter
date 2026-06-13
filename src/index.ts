import "./env.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import userController from "./controller/user.controller.js";
import permissionsController from "./controller/permissions.controller.js";
import menuController from "./controller/menu.controller.js";
import roleController from "./controller/role.controller.js";
import healthController from "./controller/health.controller.js";
import { ValidationException } from "./exceptions/validation.exception.js";
import { requestLogger } from "./middleware/requestLogger.middleware.js";
import type { AppEnv } from "./types/hono.js";
import { HTTP_STATUS } from "./utils/const.js";
import { logger } from "./utils/logger.js";
import { fail } from "./utils/response.js";
import { env } from "./env.js";
import { redisMiddleware } from "./middleware/redis.middleware.js";
import redis from "./redis.js";
import { pool } from "./db/index.js";
import { cors } from "hono/cors";
import { securityHeaders } from "./middleware/securityHeaders.middleware.js";
import { xssProtection } from "./middleware/xss.middleware.js";

// 传入 AppEnv 让 c.set/c.get/c.var 获得强类型
const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: env.ALLOWED_ORIGINS ?? "*",
  }),
);
app.use("*", securityHeaders);
app.use("*", xssProtection);

/**
 * 请求日志中间件
 */
app.use("*", requestLogger);
/**
 * Redis 缓存中间件
 */
app.use("*", redisMiddleware);
/**
 * 错误处理
 */
app.onError((err, c) => {
  const requestId = c.get("requestId");
  if (err instanceof ValidationException) {
    logger.warn("validation failed", { requestId, message: err.message });
    return fail(c, HTTP_STATUS.BAD_REQUEST, err.message);
  }
  if (err instanceof HTTPException) {
    logger.warn("http exception", {
      requestId,
      status: err.status,
      message: err.message,
    });
    return fail(c, err.status, err.message);
  }
  logger.error("unhandled error", { requestId, error: err });
  return fail(c, HTTP_STATUS.INTERNAL_SERVER_ERROR, "服务器内部错误");
});

app.route("/health", healthController);
app.route("/user", userController);
app.route("/role", roleController);
app.route("/permissions", permissionsController);
app.route("/menu", menuController);

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    logger.info(`Server is running on http://localhost:${info.port}`, {
      port: info.port,
    });
  },
);

/**
 * 收到终止信号后停止接收新请求，关闭 DB / Redis 连接再退出。
 * 避免容器滚动更新或 Ctrl+C 时出现连接泄漏与请求中断。
 */
let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}, shutting down gracefully...`);

  server.close(async () => {
    try {
      redis.disconnect();
      await pool.end();
    } catch (err) {
      logger.error("error during shutdown", { error: err });
    } finally {
      process.exit(0);
    }
  });

  // 兜底：10s 内未正常关闭则强制退出
  setTimeout(() => {
    logger.error("forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
