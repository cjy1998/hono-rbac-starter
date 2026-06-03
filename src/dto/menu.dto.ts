import { z } from "zod";
import { paginationSchema } from "./common.dto.js";

export const createMenuSchema = z.object({
  parentId: z.string().default("0"),
  menuName: z.string({ message: "menuName 必须是字符串" }).min(1).max(64),
  menuType: z.coerce.number().int().min(1).max(3),
  path: z.string().max(255).default(""),
  component: z.string().max(255).default(""),
  icon: z.string().max(64).default(""),
  redirect: z.string().max(255).default(""),
  permissionCode: z.string().max(128).default(""),
  visible: z.coerce.number().int().min(0).max(1).default(1),
  keepAlive: z.coerce.number().int().min(0).max(1).default(0),
  sortOrder: z.coerce.number().int().default(0),
  status: z.coerce.number().int().min(0).max(1).default(1),
});

export type CreateMenuDTO = z.infer<typeof createMenuSchema>;

export const updateMenuSchema = createMenuSchema.partial();

export type UpdateMenuDTO = z.infer<typeof updateMenuSchema>;

export const menuQuerySchema = paginationSchema.extend({
  parentId: z.string().optional(),
  menuName: z.string().optional(),
  menuType: z.coerce.number().int().min(1).max(3).optional(),
  path: z.string().optional(),
  visible: z.coerce.number().int().min(0).max(1).optional(),
  status: z.coerce.number().int().min(0).max(1).optional(),
});

export type MenuQueryDTO = z.infer<typeof menuQuerySchema>;

export const menuTreeQuerySchema = menuQuerySchema.omit({
  page: true,
  pageSize: true,
});

export type MenuTreeQueryDTO = z.infer<typeof menuTreeQuerySchema>;
