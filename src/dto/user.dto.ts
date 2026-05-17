import { z } from "zod";

export const createUserSchema = z.object({
  username: z
    .string({ message: "username 必须是字符串" })
    .min(2, "username 至少 2 个字符")
    .max(50, "username 最长 50 个字符"),
  nickname: z
    .string({ message: "nickname 必须是字符串" })
    .min(2, "nickname 至少 2 个字符")
    .max(50, "nickname 最长 50 个字符"),
  email: z.email("email 格式不正确").max(255),
  phone: z.string().max(20, "phone 最长 20 个字符"),
  password: z.string().min(6, "password 至少 6 位"),
  avatar: z.string().max(255, "avatar 最长 255 个字符"),
  status: z.number().int().positive().default(1),
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
  id: z.string({ message: "id 必须是字符串" }),
});

export type UserIdParamDTO = z.infer<typeof userIdParamSchema>;

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  keyword: z.string().trim().optional(),
});

export type UserQueryDTO = z.infer<typeof userQuerySchema>;
