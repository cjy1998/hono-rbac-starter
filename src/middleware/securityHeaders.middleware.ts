import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types/hono.js";

/**
 * 安全响应头中间件
 */
export const securityHeaders = createMiddleware<AppEnv>(async (c, next) => {
  c.header("X-Frame-Options", "DENY");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Permitted-Cross-Domain-Policies", "none");
  c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  c.header(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );

  await next();
});
