import { and, eq, like } from "drizzle-orm";
import { sign } from "hono/jwt";
import argon2 from "argon2";
import db from "../db/index.js";
import { usersTable } from "../db/schema/users.js";
import { notDeleted, paginate } from "../utils/query.js";
import type {
  CreateUserDTO,
  LoginDTO,
  UpdatePasswordDTO,
  UpdateUserDTO,
  UserQueryDTO,
} from "../dto/user.dto.js";
import {
  toUserVO,
  type UserListVO,
  type UserVO,
  type UserWithRolesVO,
} from "../vo/user.vo.js";
import { toRoleVO } from "../vo/roles.vo.js";
import { HTTP_STATUS } from "../utils/const.js";
import { env } from "../env.js";
import type { UserPayload } from "../types/hono.js";
import { logger } from "../utils/logger.js";
import { HTTPException } from "hono/http-exception";
class UserService {
  /**
   * 创建用户
   */
  async createUser(user: CreateUserDTO): Promise<UserVO> {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, user.email))
      .limit(1);
    if (rows.length > 0) {
      throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
        message: "邮箱已注册",
      });
    }
    const storageHash = await argon2.hash(user.password);
    const newUser = { ...user, password: storageHash };
    const result = await db.insert(usersTable).values(newUser).$returningId();
    const resulUser = await this.getUserById(result[0].id);
    return resulUser;
  }
  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<{ id: string }> {
    await this.getUserById(id);
    await db
      .update(usersTable)
      .set({ deletedAt: new Date() })
      .where(eq(usersTable.id, id));
    return { id };
  }
  /**
   * 更新用户
   */
  async updateUser(id: string, user: UpdateUserDTO): Promise<UserVO> {
    await this.getUserById(id);
    await db.update(usersTable).set(user).where(eq(usersTable.id, id));
    const newUser = await this.getUserById(id);
    return newUser;
  }
  /**
   * 修改密码
   */
  async updatePassword(id: string, dto: UpdatePasswordDTO): Promise<null> {
    await this.getUserById(id);
    const storageHash = await argon2.hash(dto.password);
    await db
      .update(usersTable)
      .set({ password: storageHash })
      .where(eq(usersTable.id, id));
    return null;
  }
  /**
   * 获取用户列表
   */
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
  /**
   * 获取用户
   */
  async getUserById(id: string) {
    const where = and(notDeleted(usersTable), eq(usersTable.id, id));
    const rows = await db.select().from(usersTable).where(where).limit(1);
    if (rows.length === 0) {
      throw new HTTPException(HTTP_STATUS.NOT_FOUND, {
        message: "用户不存在",
      });
    }
    if (rows[0].status === 0) {
      throw new HTTPException(HTTP_STATUS.FORBIDDEN, {
        message: "用户已禁用",
      });
    }
    return toUserVO(rows[0]);
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
  /**
   * 根据邮箱获取用户
   */
  async getUserByEmail(email: string) {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (rows.length === 0) {
      throw new HTTPException(HTTP_STATUS.NOT_FOUND, {
        message: "用户不存在",
      });
    }
    if (rows[0].status === 0) {
      throw new HTTPException(HTTP_STATUS.FORBIDDEN, {
        message: "用户已禁用",
      });
    }
    return rows[0];
  }

  async login(
    dto: LoginDTO,
  ): Promise<
    | { success: true; user: UserWithRolesVO; token: string }
    | { success: false; errorCode: number; message: string }
  > {
    const user = await this.getUserByEmail(dto.email);

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
