import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema/index.js";
import { env } from "../env.js";

/**
 * 显式创建连接池并导出，便于在进程退出时主动关闭，避免连接泄漏。
 */
export const pool = mysql.createPool(env.DATABASE_URL);

const db = drizzle(pool, { schema, mode: "default" });

export default db;
