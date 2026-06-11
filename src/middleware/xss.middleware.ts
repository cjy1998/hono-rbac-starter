import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { HTTP_STATUS } from "../utils/const.js";
import type { AppEnv } from "../types/hono.js";

const XSS_PATTERNS = [
  /<script\b/i,
  /<\/script>/i,
  /javascript:/i,
  /\bon\w+\s*=/i,
  /<iframe\b/i,
  /data:text\/html/i,
];

const hasSuspiciousXss = (value: string) =>
  XSS_PATTERNS.some((pattern) => pattern.test(value));

const containsXssPayload = (input: unknown): boolean => {
  if (typeof input === "string") return hasSuspiciousXss(input);
  if (Array.isArray(input)) return input.some(containsXssPayload);
  if (input && typeof input === "object") {
    return Object.values(input).some(containsXssPayload);
  }
  return false;
};

/**
 * XSS 基础防护中间件：拦截 query/param/json 中的常见恶意 payload
 */
export const xssProtection = createMiddleware<AppEnv>(async (c, next) => {
  const queryValues = Object.values(c.req.queries()).flat();
  if (containsXssPayload(queryValues) || containsXssPayload(c.req.param())) {
    throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
      message: "请求包含非法输入",
    });
  }

  const method = c.req.method.toUpperCase();
  const contentType = c.req.header("content-type") || "";
  const shouldInspectBody =
    ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
    contentType.includes("application/json");

  if (shouldInspectBody) {
    try {
      const body = await c.req.raw.clone().json();
      if (containsXssPayload(body)) {
        throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
          message: "请求包含非法输入",
        });
      }
    } catch (err) {
      if (err instanceof HTTPException) throw err;
    }
  }

  await next();
});
