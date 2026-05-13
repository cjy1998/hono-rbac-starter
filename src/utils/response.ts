import type { Context } from "hono";
import type { HTTP_STATUS } from "./const.js";

export const ok = <T>(c: Context, data: T) =>
  c.json({ success: true, data, errorCode: 0, message: "ok" });

export const fail = (c: Context, errorCode: number, message: string) =>
  c.json({ success: false, data: null, errorCode, message });
