import { z } from "zod";
import { paginationSchema } from "./common.dto.js";

export const createPermissionSchema = z.object({
  permissionName: z.string().min(1).max(64),
  permissionCode: z.string().min(1).max(128),
  permissionType: z.number().int().positive().default(1),
  resource: z.string().max(255).default(""),
  status: z.number().default(1),
  method: z.string().max(16).default(""),
  remark: z.string().max(255).default(""),
});

export type CreatePermissionDTO = z.infer<typeof createPermissionSchema>;

export const updatePermissionSchema = z.object({
  permissionName: z
    .string({ message: "permissionName 必须是字符串" })
    .min(1)
    .max(64)
    .optional(),
  permissionCode: z
    .string({ message: "permissionCode 必须是字符串" })
    .min(1)
    .max(128)
    .optional(),
  permissionType: z.number().int().positive().default(1).optional(),
  resource: z.string().max(255).default("").optional(),
  method: z.string().max(16).default("").optional(),
  status: z.number().int().default(1).optional(),
  remark: z.string().max(255).default("").optional(),
});

export type UpdatePermissionDTO = z.infer<typeof updatePermissionSchema>;

export const permissionQuerySchema = paginationSchema.extend({
  permissionName: z.string().optional(),
  permissionCode: z.string().optional(),
  permissionType: z.number().int().positive().optional(),
  resource: z.string().optional(),
  method: z.string().optional(),
  status: z.number().int().optional(),
});
/**
 * 权限查询 DTO
 */
export type PermissionQueryDTO = z.infer<typeof permissionQuerySchema>;
