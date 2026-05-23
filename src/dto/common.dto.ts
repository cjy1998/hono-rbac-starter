import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
});

export type PaginationDTO = z.infer<typeof paginationSchema>;

export const idSchema = z.object({
  id: z.string({ message: "id 必须是字符串" }),
});

/**
 * ID 参数 DTO
 */
export type IdDTO = z.infer<typeof idSchema>;
