import { and, eq, like } from "drizzle-orm";
import { sign } from "hono/jwt";
import argon2 from "argon2";
import db from "../db/index.js";
import { usersTable } from "../db/schema/users.js";
import { notDeleted, paginate } from "../utils/query.js";
import type { CreateUserDTO, LoginDTO, UserQueryDTO } from "../dto/user.dto.js";
import {
  toUserVO,
  type UserListVO,
  type UserWithRolesVO,
} from "../vo/user.vo.js";
import { toRoleVO } from "../vo/roles.vo.js";
import { HTTP_STATUS } from "../utils/const.js";
import { env } from "../env.js";
import type { UserPayload } from "../types/hono.js";
class UserService {
  async getUsers(query: UserQueryDTO): Promise<UserListVO> {
    const { page, pageSize, username, email } = query;

    const where = and(
      notDeleted(usersTable),
      username ? like(usersTable.username, `%${username}%`) : undefined,
      email ? like(usersTable.email, `%${email}%`) : undefined,
    );

    const result = await paginate(usersTable, { page, pageSize }, where);

    return {
      ...result,
      list: result.list.map(toUserVO),
    };
  }

  async getUserById(id: string) {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    return rows[0];
  }

  async getUserWithRoles(id: string) {
    const rows = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, id),
      with: {
        userRoles: {
          with: {
            role: true,
          },
        },
      },
    });
    return rows;
  }

  async createUser(user: CreateUserDTO) {
    const [newUser] = await db.insert(usersTable).values(user).$returningId();
    return newUser;
  }

  async getUserByEmail(email: string) {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    return rows[0];
  }

  async login(
    dto: LoginDTO,
  ): Promise<
    | { success: true; user: UserWithRolesVO; token: string }
    | { success: false; errorCode: number; message: string }
  > {
    const user = await this.getUserByEmail(dto.email);
    if (!user) {
      return {
        success: false,
        errorCode: HTTP_STATUS.NOT_FOUND,
        message: "用户不存在",
      };
    }

    const isPasswordValid = await argon2.verify(user.password, dto.password);
    if (!isPasswordValid) {
      return {
        success: false,
        errorCode: HTTP_STATUS.UNAUTHORIZED,
        message: "密码不正确",
      };
    }

    const userWithRoles = await this.getUserWithRoles(user.id);
    const userVO: UserWithRolesVO = {
      ...toUserVO(user),
      roles: userWithRoles?.userRoles.map((ur) => toRoleVO(ur.role)) ?? [],
    };

    // JWT 只存必要字段，权限在 roleAuth 中间件中按需查库
    const payload: UserPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24小时后过期
    };
    const token = await sign(payload, env.JWT_SECRET);

    return { success: true, user: userVO, token };
  }
}

export default new UserService();
