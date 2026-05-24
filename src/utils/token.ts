import { createHash } from "node:crypto";

/**
 * 从 Authorization 头中提取标准 Bearer token。
 */
export const getBearerToken = (authorization?: string) => {
  const [scheme, token] = authorization?.split(" ") ?? [];
  if (scheme !== "Bearer" || !token) return undefined;
  return token;
};

/**
 * 黑名单 key 使用 token 摘要，避免在 Redis 中直接保存原始 token。
 */
export const getTokenBlacklistKey = (token: string) => {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return `jwt:blacklist:${tokenHash}`;
};

/**
 * 黑名单 TTL 和 JWT 剩余有效期保持一致，过期后自动释放 Redis 空间。
 */
export const getTokenTtl = (exp: number) =>
  Math.max(exp - Math.floor(Date.now() / 1000), 0);
