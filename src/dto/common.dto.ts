import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

export type PaginationDTO = z.infer<typeof paginationSchema>;

export const idSchema = z.object({
  id: z.string({ message: "id 必须是字符串" }),
});

const idsSchema = z
  .array(z.string({ message: "id 必须是字符串" }))
  .min(1, "至少选择一个 id")
  .transform((ids) => [...new Set(ids)]);

export const roleIdsSchema = z.object({
  roleIds: idsSchema,
});

export const permissionIdsSchema = z.object({
  permissionIds: idsSchema,
});

export const menuIdsSchema = z.object({
  menuIds: idsSchema,
});

/**
 * ID 参数 DTO
 */
export type IdDTO = z.infer<typeof idSchema>;
export type RoleIdsDTO = z.infer<typeof roleIdsSchema>;
export type PermissionIdsDTO = z.infer<typeof permissionIdsSchema>;
export type MenuIdsDTO = z.infer<typeof menuIdsSchema>;
