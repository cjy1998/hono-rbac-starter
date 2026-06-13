import { Hono } from "hono";
import { sql } from "drizzle-orm";
import db from "../db/index.js";
import redis from "../redis.js";
import { HTTP_STATUS } from "../utils/const.js";
import type { AppEnv } from "../types/hono.js";

const healthController = new Hono<AppEnv>();

type DependencyStatus = "up" | "down";

const checkDatabase = async (): Promise<DependencyStatus> => {
  try {
    await db.execute(sql`SELECT 1`);
    return "up";
  } catch {
    return "down";
  }
};

const checkRedis = async (): Promise<DependencyStatus> => {
  try {
    const pong = await redis.ping();
    return pong === "PONG" ? "up" : "down";
  } catch {
    return "down";
  }
};

/**
 * 健康检查
 * - 存活探针（liveness）：进程是否在跑
 * - 就绪探针（readiness）：依赖的 DB / Redis 是否可用
 * 任一依赖不可用时返回 503，便于 k8s / 负载均衡剔除实例。
 */
healthController.get("/", async (c) => {
  const [database, cache] = await Promise.all([checkDatabase(), checkRedis()]);
  const healthy = database === "up" && cache === "up";

  return c.json(
    {
      status: healthy ? "ok" : "degraded",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      services: { database, redis: cache },
    },
    healthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE,
  );
});

/**
 * 存活探针：只确认进程能响应，不探测下游依赖。
 */
healthController.get("/live", (c) => c.json({ status: "ok" }));

export default healthController;
