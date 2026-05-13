import type { usersTable } from "../db/schema.js";

type UserPO = typeof usersTable.$inferSelect;

export interface UserVO {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export const toUserVO = (user: UserPO): UserVO => ({
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

export interface UserListVO {
  list: UserVO[];
  total: number;
}
