import { zValidator as zv } from "@hono/zod-validator";
import { ValidationException } from "../exceptions/validation-exception.js";
import type { ZodError } from "zod";

/**
 * Zod 参数校验中间件
 */
export const zValidator: typeof zv = (target: any, schema: any) =>
  zv(target as any, schema as any, (result) => {
    if (!result.success)
      throw new ValidationException(result.error as ZodError);
  }) as any;
