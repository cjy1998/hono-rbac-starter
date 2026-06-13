import { and, eq, inArray, like, ne } from "drizzle-orm";
import { sign } from "hono/jwt";
import argon2 from "argon2";
import db from "../db/index.js";
import { rolesTable } from "../db/schema/roles.js";
import { userRoleTable } from "../db/schema/user_role.js";
import { usersTable } from "../db/schema/users.js";
import { notDeleted, paginate } from "../utils/query.js";
import type {
  CreateUserDTO,
  LoginDTO,
  UpdatePasswordDTO,
  UpdateUserDTO,
  UserQueryDTO,
} from "../dto/user.dto.js";
import type { RoleIdsDTO } from "../dto/common.dto.js";
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
import { parseJwtExpiresInSeconds } from "../utils/token.js";
class UserService {
  private static readonly PRIVILEGED_ROLE_CODES = new Set([
    "super_admin",
    "admin",
  ]);
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
    const existingUser = await this.getExistingUserById(id);
    if (dto.oldPassword) {
      const isOldPasswordValid = await argon2.verify(
        existingUser.password,
        dto.oldPassword,
      );
      if (!isOldPasswordValid) {
        throw new HTTPException(HTTP_STATUS.BAD_REQUEST, {
          message: "旧密码不正确",
        });
      }
    }
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
   * 给用户绑定角色
   */
  async addUserRoles(
    id: string,
    dto: RoleIdsDTO,
  ): Promise<{ userId: string; roleIds: string[] }> {
    await this.getExistingUserById(id);
    await this.ensureRolesExist(dto.roleIds);

    const existingRows = await db
      .select({ roleId: userRoleTable.roleId })
      .from(userRoleTable)
      .where(
        and(
          eq(userRoleTable.userId, id),
          inArray(userRoleTable.roleId, dto.roleIds),
        ),
      );
    const existingRoleIds = new Set(existingRows.map((row) => row.roleId));
    const roleIdsToInsert = dto.roleIds.filter(
      (roleId) => !existingRoleIds.has(roleId),
    );

    if (roleIdsToInsert.length > 0) {
      await db.insert(userRoleTable).values(
        roleIdsToInsert.map((roleId) => ({
          userId: id,
          roleId,
        })),
      );
    }

    return { userId: id, roleIds: dto.roleIds };
  }
  /**
   * 解绑用户角色
   */
  async deleteUserRoles(
    id: string,
    dto: RoleIdsDTO,
  ): Promise<{ userId: string; roleIds: string[] }> {
    await this.getExistingUserById(id);
    await this.ensureRolesExist(dto.roleIds);

    await db
      .delete(userRoleTable)
      .where(
        and(
          eq(userRoleTable.userId, id),
          inArray(userRoleTable.roleId, dto.roleIds),
        ),
      );

    return { userId: id, roleIds: dto.roleIds };
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
  async isPrivilegedUser(userId: string): Promise<boolean> {
    const userWithRoles = await this.getUserWithRoles(userId);
    return (
      userWithRoles?.userRoles.some((ur) =>
        UserService.PRIVILEGED_ROLE_CODES.has(ur.role.roleCode),
      ) ?? false
    );
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
  /**
   * 登录
   */
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
      exp:
        Math.floor(Date.now() / 1000) +
        parseJwtExpiresInSeconds(env.JWT_EXPIRES_IN),
    };
    const token = await sign(payload, env.JWT_SECRET);

    return { success: true, user: userVO, token };
  }

  private async ensureRolesExist(roleIds: string[]) {
    const rows = await db
      .select({ id: rolesTable.id })
      .from(rolesTable)
      .where(and(notDeleted(rolesTable), inArray(rolesTable.id, roleIds)));
    if (rows.length !== roleIds.length) {
      throw new HTTPException(HTTP_STATUS.NOT_FOUND, {
        message: "角色不存在",
      });
    }
  }
}

export default new UserService();
