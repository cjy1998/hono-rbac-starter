/**
 * 角色鉴权中间件
 * 根据 user.id 查库获取角色和权限，匹配当前请求的 path + method
 * 角色和权限均有 Redis 缓存，TTL 5 分钟
 */
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { HTTP_STATUS } from "../utils/const.js";
import type { AppEnv } from "../types/hono.js";
import userService from "../service/user.js";
import permissionsService from "../service/permissions.js";

const SUPER_ADMIN_CODE = "super_admin";
const ROLES_TTL = 300; // 5 分钟

type UserWithRoles = Awaited<ReturnType<typeof userService.getUserWithRoles>>;
type Permissions = Awaited<
  ReturnType<typeof permissionsService.getPermissionsByRoleIds>
>;

export const roleAuth = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(HTTP_STATUS.UNAUTHORIZED, {
      message: "未登录",
    });
  }

  const redis = c.get("redis");

  // 1. 查用户角色（优先读缓存）
  const rolesKey = `user:roles:${user.id}`;
  let userWithRoles: UserWithRoles;
  const cachedRoles = await redis.get(rolesKey);
  if (cachedRoles) {
    userWithRoles = JSON.parse(cachedRoles) as UserWithRoles;
  } else {
    userWithRoles = await userService.getUserWithRoles(user.id);
    await redis.set(rolesKey, JSON.stringify(userWithRoles), "EX", ROLES_TTL);
  }

  const roleIds = userWithRoles?.userRoles.map((ur) => ur.role.id) ?? [];

  // 2. 超级管理员直接放行
  const isSuperAdmin =
    userWithRoles?.userRoles.some(
      (ur) => ur.role.roleCode === SUPER_ADMIN_CODE,
    ) ?? false;
  if (isSuperAdmin) {
    await next();
    return;
  }

  // 3. 查角色对应的权限（优先读缓存，按 roleId 排序保证 key 稳定）
  const permissionsKey = `permissions:roles:${[...roleIds].sort().join(",")}`;
  let permissions: Permissions;
  const cachedPermissions = await redis.get(permissionsKey);
  if (cachedPermissions) {
    permissions = JSON.parse(cachedPermissions) as Permissions;
  } else {
    permissions = await permissionsService.getPermissionsByRoleIds(roleIds);
    await redis.set(
      permissionsKey,
      JSON.stringify(permissions),
      "EX",
      ROLES_TTL,
    );
  }

  // 4. 匹配当前请求的 path + method
  const { method } = c.req;
  const path = new URL(c.req.url).pathname;

  const hasPermission = permissions.some((p) => {
    // 只匹配 API 类型权限（permissionType === 2）
    if (p.permissionType !== 2) return false;
    // 精确匹配
    if (p.resource === path && p.method === method) return true;
    // 通配符匹配：/api/users/* 匹配 /api/users/123
    if (
      p.resource.endsWith("/*") &&
      path.startsWith(p.resource.slice(0, -1)) &&
      p.method === method
    ) {
      return true;
    }
    return false;
  });

  if (!hasPermission) {
    throw new HTTPException(HTTP_STATUS.FORBIDDEN, {
      message: "没有权限访问此接口",
    });
  }

  await next();
});
