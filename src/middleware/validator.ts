import { zValidator as zv } from "@hono/zod-validator";
import { ValidationException } from "../exceptions/validation-exception.js";
import type { ZodError } from "zod";

export const zValidator: typeof zv = (target: any, schema: any) =>
  zv(target as any, schema as any, (result) => {
    if (!result.success)
      throw new ValidationException(result.error as ZodError);
  }) as any;
