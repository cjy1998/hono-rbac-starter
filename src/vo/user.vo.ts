import type { usersTable } from "../db/schema/users.js";
import type { PaginatedVO } from "./common.vo.js";
import type { RoleVO } from "./roles.vo.js";

type UserPO = typeof usersTable.$inferSelect;

export interface UserVO {
  id: string;
  username: string;
  nickname: string;
  phone: string;
  avatar: string;
  status: number;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export const toUserVO = (user: UserPO): UserVO => ({
  id: user.id,
  username: user.username,
  nickname: user.nickname,
  phone: user.phone,
  avatar: user.avatar,
  status: user.status,
  email: user.email,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

export interface UserWithRolesVO extends UserVO {
  roles: RoleVO[];
}

export type UserListVO = PaginatedVO<UserVO>;
