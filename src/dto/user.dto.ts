import { z } from "zod";
import { paginationSchema } from "./common.dto.js";

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
  phone: z
    .string("phone 必须是字符串")
    .max(20, "phone 最长 20 个字符")
    .optional(),
  password: z.string("password 必须是字符串").min(6, "password 至少 6 位"),
  avatar: z.string().max(255, "avatar 最长 255 个字符").optional(),
  status: z.number().int().positive().default(1),
});
export type CreateUserDTO = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  username: z
    .string()
    .min(2, "username 至少 2 个字符")
    .max(50, "username 最长 50 个字符")
    .optional(),
  nickname: z
    .string()
    .min(2, "nickname 至少 2 个字符")
    .max(50, "nickname 最长 50 个字符")
    .optional(),
  email: z.email("email 格式不正确").max(255).optional(),
  phone: z.string().max(20, "phone 最长 20 个字符").optional(),
  avatar: z.string().max(255, "avatar 最长 255 个字符").optional(),
  status: z.number().int().positive().default(1).optional(),
});
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;

export const loginSchema = z.object({
  email: z.email("email 格式不正确").max(255),
  password: z
    .string()
    .min(6, "password 至少 6 位")
    .max(50, "password 最长 50 位"),
});
export type LoginDTO = z.infer<typeof loginSchema>;

export const userQuerySchema = paginationSchema.extend({
  username: z.string().trim().optional(),
  email: z.string().trim().optional(),
});

export type UserQueryDTO = z.infer<typeof userQuerySchema>;

export const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(6, "password 至少 6 位")
    .max(50, "password 最长 50 位"),
});
export type UpdatePasswordDTO = z.infer<typeof updatePasswordSchema>;
