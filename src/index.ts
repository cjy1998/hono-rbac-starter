import "./env.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import userController from "./controller/user.js";
import { ValidationException } from "./exceptions/validation-exception.js";
import { requestLogger } from "./middleware/requestLogger.js";
import type { AppEnv } from "./types/hono.js";
import { HTTP_STATUS } from "./utils/const.js";
import { logger } from "./utils/logger.js";
import { fail } from "./utils/response.js";
import { env } from "./env.js";
import { redisMiddleware } from "./middleware/redis.middleware.js";

// 传入 AppEnv 让 c.set/c.get/c.var 获得强类型
const app = new Hono<AppEnv>();
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

app.route("/user", userController);

serve(
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
