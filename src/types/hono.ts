/**
 * Hono 应用级别的类型声明
 * ----------------------------------------------------------------
 * 通过给 new Hono<AppEnv>() 传入泛型，可以让 c.set / c.get / c.var
 * 拥有强类型，避免出现 "类型 string 的参数不能赋给类型 never" 的报错。
 *
 * 约定：
 * - 任何被中间件挂到 context 上的变量，都要在这里登记一行
 */
import type { JWTPayload } from "hono/utils/jwt/types";

export type AppEnv = {
  Variables: {
    /** 每个请求的唯一标识，由 requestLogger 中间件写入 */
    requestId: string;
    /** JWT 解析出来的 payload，由 jwtAuth 中间件写入 */
    user?: JWTPayload;
  };
};
