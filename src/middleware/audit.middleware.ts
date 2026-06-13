import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types/hono.js";
import auditService from "../service/audit.service.js";

/**
 * 仅审计「写操作」，读操作（GET/HEAD/OPTIONS）不记录。
 */
const AUDITED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * 审计中间件
 * 在响应结束后，将写操作落库到 audit_logs。
 * 审计写入是异步、容错的，不会阻塞或影响主请求。
 */
export const audit = createMiddleware<AppEnv>(async (c, next) => {
  const start = Date.now();
  const { method } = c.req;

  await next();

  if (!AUDITED_METHODS.has(method)) return;

  const url = new URL(c.req.url);
  const user = c.get("user");
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "";

  // 不阻塞响应返回：record 内部已做容错
  void auditService.record({
    userId: user?.id ?? null,
    username: user?.username ?? "",
    action: `${method} ${url.pathname}`,
    method,
    path: url.pathname,
    resourceId: c.req.param("id") ?? null,
    status: c.res.status,
    ip,
    userAgent: c.req.header("user-agent")?.slice(0, 512) ?? "",
    requestId: c.get("requestId") ?? "",
    durationMs: Date.now() - start,
  });
});
