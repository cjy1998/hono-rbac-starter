/**
 * 缓存空值占位符，用于防止缓存穿透
 */
export const CACHE_NULL_VALUE = "__CACHE_NULL__";

/**
 * 返回带随机抖动的 TTL（秒），用于缓解缓存雪崩
 */
export const getTtlWithJitter = (baseTtlSec: number, jitterSec = 30) => {
  const randomOffset =
    Math.floor(Math.random() * (jitterSec * 2 + 1)) - jitterSec;
  return Math.max(1, baseTtlSec + randomOffset);
};
