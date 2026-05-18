import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema/index.js";
import { env } from "../env.js";

const db = drizzle(env.DATABASE_URL, { schema, mode: "default" });

export default db;
