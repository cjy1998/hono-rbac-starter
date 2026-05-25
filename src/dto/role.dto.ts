import { z } from "zod";
import { paginationSchema } from "./common.dto.js";

export const createRoleSchema = z.object({
  roleName: z.string({ message: "roleName 必须是字符串" }).min(1).max(20),
  roleCode: z.string({ message: "roleCode 必须是字符串" }).min(1).max(20),
  sortOrder: z.number().int().positive().default(0),
  status: z.number().int().default(1),
  remark: z.string().max(255).default(""),
});

export type CreateRoleDTO = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  roleName: z
    .string({ message: "roleName 必须是字符串" })
    .min(1)
    .max(20)
    .optional(),
  roleCode: z
    .string({ message: "roleCode 必须是字符串" })
    .min(1)
    .max(20)
    .optional(),
  sortOrder: z.number().int().positive().default(0).optional(),
  status: z.number().int().default(1).optional(),
  remark: z.string().max(255).default("").optional(),
});

export type UpdateRoleDTO = z.infer<typeof updateRoleSchema>;

export const roleQuerySchema = paginationSchema.extend({
  roleName: z.string().optional(),
  roleCode: z.string().optional(),
  status: z.number().int().optional(),
});
/**
 * 角色查询 DTO
 */
export type RoleQueryDTO = z.infer<typeof roleQuerySchema>;
