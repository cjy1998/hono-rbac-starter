import { z } from "zod";

export const createUserSchema = z.object({
  name: z
    .string({ message: "name 必须是字符串" })
    .min(2, "name 至少 2 个字符")
    .max(50, "name 最长 50 个字符"),
  email: z.email("email 格式不正确").max(255),
  password: z
    .string()
    .min(6, "password 至少 6 位")
    .max(50, "password 最长 50 位"),
});
export type CreateUserDTO = z.infer<typeof createUserSchema>;

export const loginSchema = z.object({
  email: z.email("email 格式不正确").max(255),
  password: z
    .string()
    .min(6, "password 至少 6 位")
    .max(50, "password 最长 50 位"),
});
export type LoginDTO = z.infer<typeof loginSchema>;

export const userIdParamSchema = z.object({
  id: z.coerce
    .number({ message: "id 必须是数字" })
    .int("id 必须是整数")
    .positive("id 必须大于 0"),
});

export type UserIdParamDTO = z.infer<typeof userIdParamSchema>;

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  keyword: z.string().trim().optional(),
});

export type UserQueryDTO = z.infer<typeof userQuerySchema>;
