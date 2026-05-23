import { HTTPException } from "hono/http-exception";
import type { ZodError } from "zod";
/**
 * 参数校验异常
 */
export class ValidationException extends HTTPException {
  issues: ZodError["issues"];
  /**
   * 构造函数
   * @param error 错误信息
   */
  constructor(error: ZodError) {
    super(400, { message: error.issues[0]?.message ?? "参数校验失败" });
    this.issues = error.issues;
  }
}
