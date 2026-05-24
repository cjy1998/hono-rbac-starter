import { and, eq, like, ne } from "drizzle-orm";
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
    const resultUser = await this.getExistingUserById(result[0].id);
    return toUserVO(resultUser);
  }
  /**
   * 删除用户
   */
  async deleteUser(id: string): Promise<{ id: string }> {
    await this.getExistingUserById(id);
    await db
      .update(usersTable)
      .set({ deletedAt: new Date() })
      .where(and(notDeleted(usersTable), eq(usersTable.id, id)));
    return { id };
  }
  /**
   * 更新用户
   */
  async updateUser(id: string, user: UpdateUserDTO): Promise<UserVO> {
    const existingUser = await this.getExistingUserById(id);
    if (user.email && user.email !== existingUser.email) {
      const rows = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.email, user.email), ne(usersTable.id, id)))
        .limit(1);
      if (rows.length > 0) {
        throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
          message: "邮箱已注册",
        });
      }
    }
    await db
      .update(usersTable)
      .set(user)
      .where(and(notDeleted(usersTable), eq(usersTable.id, id)));
    const newUser = await this.getExistingUserById(id);
    return toUserVO(newUser);
  }
  /**
   * 修改密码
   */
  async updatePassword(id: string, dto: UpdatePasswordDTO): Promise<null> {
    await this.getExistingUserById(id);
    const storageHash = await argon2.hash(dto.password);
    await db
      .update(usersTable)
      .set({ password: storageHash })
      .where(and(notDeleted(usersTable), eq(usersTable.id, id)));
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
    const user = await this.getActiveUserById(id);
    return toUserVO(user);
  }
  /**
   * 验证用户是否存在
   */
  async getExistingUserById(id: string) {
    const rows = await db
      .select()
      .from(usersTable)
      .where(and(notDeleted(usersTable), eq(usersTable.id, id)))
      .limit(1);
    if (rows.length === 0) {
      throw new HTTPException(HTTP_STATUS.NOT_FOUND, {
        message: "用户不存在",
      });
    }
    return rows[0];
  }
  /**
   * 验证用户是否启用
   */
  async getActiveUserById(id: string) {
    const user = await this.getExistingUserById(id);
    if (user.status === 0) {
      throw new HTTPException(HTTP_STATUS.FORBIDDEN, {
        message: "用户已禁用",
      });
    }
    return user;
  }
  async getUserWithRoles(id: string) {
    const rows = await db.query.usersTable.findFirst({
      where: and(notDeleted(usersTable), eq(usersTable.id, id)),
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
      .where(and(notDeleted(usersTable), eq(usersTable.email, email)))
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
    const rows = await db
      .select()
      .from(usersTable)
      .where(and(notDeleted(usersTable), eq(usersTable.email, dto.email)))
      .limit(1);
    const user = rows[0];
    if (!user) {
      return {
        success: false,
        errorCode: HTTP_STATUS.UNAUTHORIZED,
        message: "邮箱或密码不正确",
      };
    }
    if (user.status === 0) {
      return {
        success: false,
        errorCode: HTTP_STATUS.FORBIDDEN,
        message: "用户已禁用",
      };
    }

    const isPasswordValid = await argon2.verify(user.password, dto.password);
    if (!isPasswordValid) {
      return {
        success: false,
        errorCode: HTTP_STATUS.UNAUTHORIZED,
        message: "邮箱或密码不正确",
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
