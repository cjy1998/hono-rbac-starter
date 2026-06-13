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

const TIME_UNITS_IN_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
};

/**
 * 将 JWT 过期配置解析为秒，支持格式：
 * - 纯数字秒（如 "3600"）
 * - 带单位（如 "30m"、"24h"、"7d"）
 */
export const parseJwtExpiresInSeconds = (value: string): number => {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  const match = /^(\d+)([smhd])$/i.exec(trimmed);
  if (!match) {
    throw new Error(
      `Invalid JWT_EXPIRES_IN: ${value}. Use seconds or <number><s|m|h|d>.`,
    );
  }
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  return amount * TIME_UNITS_IN_SECONDS[unit];
};
