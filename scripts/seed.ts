import "dotenv/config";
import argon2 from "argon2";
import { v4 as uuidv4 } from "uuid";
import db from "../src/db/index.js";
import { menusTable } from "../src/db/schema/menus.js";
import { permissionsTable } from "../src/db/schema/permissions.js";
import { roleMenuTable } from "../src/db/schema/role_menu.js";
import { rolePermissionTable } from "../src/db/schema/role_permission.js";
import { rolesTable } from "../src/db/schema/roles.js";
import { userRoleTable } from "../src/db/schema/user_role.js";
import { usersTable } from "../src/db/schema/users.js";

/**
 * 角色定义
 */
const ROLES = [
  {
    id: uuidv4(),
    roleName: "超级管理员",
    roleCode: "super_admin",
    sortOrder: 1,
    remark: "拥有所有权限的最高管理员",
  },
  {
    id: uuidv4(),
    roleName: "管理员",
    roleCode: "admin",
    sortOrder: 2,
    remark: "普通管理员，拥有大部分管理权限",
  },
  {
    id: uuidv4(),
    roleName: "普通用户",
    roleCode: "user",
    sortOrder: 3,
    remark: "只能查看个人信息",
  },
] as const;

/**
 * 权限定义（按钮 / API 权限）
 * permissionType: 1-按钮  2-API
 */
type PermissionSeed = {
  permissionName: string;
  permissionCode: string;
  permissionType: number;
  resource?: string;
  method?: string;
};

const BUTTON_PERMISSIONS: PermissionSeed[] = [
  { permissionName: "用户列表", permissionCode: "user:list", permissionType: 1 },
  { permissionName: "创建用户", permissionCode: "user:create", permissionType: 1 },
  { permissionName: "编辑用户", permissionCode: "user:update", permissionType: 1 },
  { permissionName: "删除用户", permissionCode: "user:delete", permissionType: 1 },

  { permissionName: "角色列表", permissionCode: "role:list", permissionType: 1 },
  { permissionName: "创建角色", permissionCode: "role:create", permissionType: 1 },
  { permissionName: "编辑角色", permissionCode: "role:update", permissionType: 1 },
  { permissionName: "删除角色", permissionCode: "role:delete", permissionType: 1 },

  { permissionName: "菜单列表", permissionCode: "menu:list", permissionType: 1 },
  { permissionName: "创建菜单", permissionCode: "menu:create", permissionType: 1 },
  { permissionName: "编辑菜单", permissionCode: "menu:update", permissionType: 1 },
  { permissionName: "删除菜单", permissionCode: "menu:delete", permissionType: 1 },

  { permissionName: "权限列表", permissionCode: "permission:list", permissionType: 1 },
  { permissionName: "创建权限", permissionCode: "permission:create", permissionType: 1 },
  { permissionName: "编辑权限", permissionCode: "permission:update", permissionType: 1 },
  { permissionName: "删除权限", permissionCode: "permission:delete", permissionType: 1 },
];

const API_PERMISSIONS: PermissionSeed[] = [
  {
    permissionName: "用户查询接口",
    permissionCode: "api:user:list",
    permissionType: 2,
    resource: "/user",
    method: "GET",
  },
  {
    permissionName: "用户创建接口",
    permissionCode: "api:user:create",
    permissionType: 2,
    resource: "/user",
    method: "POST",
  },
  {
    permissionName: "用户更新接口",
    permissionCode: "api:user:update",
    permissionType: 2,
    resource: "/user/*",
    method: "PUT",
  },
  {
    permissionName: "用户删除接口",
    permissionCode: "api:user:delete",
    permissionType: 2,
    resource: "/user/*",
    method: "DELETE",
  },
  {
    permissionName: "角色查询接口",
    permissionCode: "api:role:list",
    permissionType: 2,
    resource: "/role",
    method: "GET",
  },
  {
    permissionName: "角色详情接口",
    permissionCode: "api:role:detail",
    permissionType: 2,
    resource: "/role/*",
    method: "GET",
  },
  {
    permissionName: "角色创建接口",
    permissionCode: "api:role:create",
    permissionType: 2,
    resource: "/role",
    method: "POST",
  },
  {
    permissionName: "角色更新接口",
    permissionCode: "api:role:update",
    permissionType: 2,
    resource: "/role/*",
    method: "PUT",
  },
  {
    permissionName: "角色删除接口",
    permissionCode: "api:role:delete",
    permissionType: 2,
    resource: "/role/*",
    method: "DELETE",
  },
  {
    permissionName: "菜单查询接口",
    permissionCode: "api:menu:list",
    permissionType: 2,
    resource: "/menu",
    method: "GET",
  },
  {
    permissionName: "菜单树接口",
    permissionCode: "api:menu:tree",
    permissionType: 2,
    resource: "/menu/tree",
    method: "GET",
  },
  {
    permissionName: "菜单详情接口",
    permissionCode: "api:menu:detail",
    permissionType: 2,
    resource: "/menu/*",
    method: "GET",
  },
  {
    permissionName: "菜单创建接口",
    permissionCode: "api:menu:create",
    permissionType: 2,
    resource: "/menu",
    method: "POST",
  },
  {
    permissionName: "菜单更新接口",
    permissionCode: "api:menu:update",
    permissionType: 2,
    resource: "/menu/*",
    method: "PUT",
  },
  {
    permissionName: "菜单删除接口",
    permissionCode: "api:menu:delete",
    permissionType: 2,
    resource: "/menu/*",
    method: "DELETE",
  },
  {
    permissionName: "权限查询接口",
    permissionCode: "api:permission:list",
    permissionType: 2,
    resource: "/permissions",
    method: "GET",
  },
  {
    permissionName: "权限详情接口",
    permissionCode: "api:permission:detail",
    permissionType: 2,
    resource: "/permissions/*",
    method: "GET",
  },
  {
    permissionName: "权限创建接口",
    permissionCode: "api:permission:create",
    permissionType: 2,
    resource: "/permissions",
    method: "POST",
  },
  {
    permissionName: "权限更新接口",
    permissionCode: "api:permission:update",
    permissionType: 2,
    resource: "/permissions/*",
    method: "PUT",
  },
  {
    permissionName: "权限删除接口",
    permissionCode: "api:permission:delete",
    permissionType: 2,
    resource: "/permissions/*",
    method: "DELETE",
  },
  {
    permissionName: "审计日志查询接口",
    permissionCode: "api:audit:list",
    permissionType: 2,
    resource: "/audit-logs",
    method: "GET",
  },
];

const PERMISSIONS = [...BUTTON_PERMISSIONS, ...API_PERMISSIONS].map((p) => ({
  id: uuidv4(),
  ...p,
  resource: p.resource ?? "",
  method: p.method ?? "",
  status: 1,
  remark: "",
}));

/**
 * 菜单定义（先生成 ID，再通过 parentCode 关联）
 * menuType: 1-目录  2-菜单  3-外链
 */
type MenuSeed = {
  id: string;
  code: string;
  parentCode: string | null;
  menuName: string;
  menuType: number;
  path: string;
  component: string;
  icon: string;
  permissionCode: string;
  sortOrder: number;
};

const RAW_MENUS: Omit<MenuSeed, "id">[] = [
  {
    code: "dashboard",
    parentCode: null,
    menuName: "仪表盘",
    menuType: 2,
    path: "/dashboard",
    component: "dashboard/index",
    icon: "dashboard",
    permissionCode: "",
    sortOrder: 1,
  },
  {
    code: "system",
    parentCode: null,
    menuName: "系统管理",
    menuType: 1,
    path: "/system",
    component: "",
    icon: "setting",
    permissionCode: "",
    sortOrder: 2,
  },
  {
    code: "system:user",
    parentCode: "system",
    menuName: "用户管理",
    menuType: 2,
    path: "/system/user",
    component: "system/user/index",
    icon: "user",
    permissionCode: "user:list",
    sortOrder: 1,
  },
  {
    code: "system:role",
    parentCode: "system",
    menuName: "角色管理",
    menuType: 2,
    path: "/system/role",
    component: "system/role/index",
    icon: "team",
    permissionCode: "role:list",
    sortOrder: 2,
  },
  {
    code: "system:menu",
    parentCode: "system",
    menuName: "菜单管理",
    menuType: 2,
    path: "/system/menu",
    component: "system/menu/index",
    icon: "menu",
    permissionCode: "menu:list",
    sortOrder: 3,
  },
  {
    code: "system:permission",
    parentCode: "system",
    menuName: "权限管理",
    menuType: 2,
    path: "/system/permission",
    component: "system/permission/index",
    icon: "key",
    permissionCode: "permission:list",
    sortOrder: 4,
  },
];

const MENUS: MenuSeed[] = RAW_MENUS.map((m) => ({ ...m, id: uuidv4() }));

/**
 * 通过 code 找菜单 ID
 */
const findMenuId = (code: string): string => {
  const menu = MENUS.find((m) => m.code === code);
  if (!menu) {
    throw new Error(`菜单 ${code} 未定义`);
  }
  return menu.id;
};

/**
 * 通过 code 找角色 ID
 */
const findRoleId = (code: string): string => {
  const role = ROLES.find((r) => r.roleCode === code);
  if (!role) {
    throw new Error(`角色 ${code} 未定义`);
  }
  return role.id;
};

/**
 * 初始用户（密码会在运行时进行 argon2 加密）
 */
const USERS_RAW = [
  {
    id: uuidv4(),
    username: "admin",
    nickname: "超级管理员",
    plainPassword: "admin123456",
    email: "admin@example.com",
    phone: "13800000001",
    roleCode: "super_admin",
  },
  {
    id: uuidv4(),
    username: "user",
    nickname: "测试用户",
    plainPassword: "user123456",
    email: "user@example.com",
    phone: "13800000002",
    roleCode: "user",
  },
];

async function seed() {
  console.log("[seed] 开始初始化数据...");

  // 加密密码
  const users = await Promise.all(
    USERS_RAW.map(async (u) => ({
      id: u.id,
      username: u.username,
      nickname: u.nickname,
      password: await argon2.hash(u.plainPassword),
      email: u.email,
      phone: u.phone,
      avatar: "",
      status: 1,
      roleCode: u.roleCode,
    })),
  );

  await db.transaction(async (tx) => {
    // 1. 按反向依赖顺序清空旧数据
    console.log("[seed] 清空旧数据...");
    await tx.delete(roleMenuTable);
    await tx.delete(rolePermissionTable);
    await tx.delete(userRoleTable);
    await tx.delete(menusTable);
    await tx.delete(permissionsTable);
    await tx.delete(usersTable);
    await tx.delete(rolesTable);

    // 2. 插入角色
    console.log("[seed] 插入角色...");
    await tx.insert(rolesTable).values(
      ROLES.map((r) => ({
        id: r.id,
        roleName: r.roleName,
        roleCode: r.roleCode,
        sortOrder: r.sortOrder,
        status: 1,
        remark: r.remark,
      })),
    );

    // 3. 插入权限
    console.log("[seed] 插入权限...");
    await tx.insert(permissionsTable).values(PERMISSIONS);

    // 4. 插入菜单（含父子关系）
    console.log("[seed] 插入菜单...");
    await tx.insert(menusTable).values(
      MENUS.map((m) => ({
        id: m.id,
        parentId: m.parentCode ? findMenuId(m.parentCode) : "0",
        menuName: m.menuName,
        menuType: m.menuType,
        path: m.path,
        component: m.component,
        icon: m.icon,
        redirect: "",
        permissionCode: m.permissionCode,
        visible: 1,
        keepAlive: 0,
        sortOrder: m.sortOrder,
        status: 1,
      })),
    );

    // 5. 插入用户
    console.log("[seed] 插入用户...");
    await tx.insert(usersTable).values(
      users.map((u) => ({
        id: u.id,
        username: u.username,
        nickname: u.nickname,
        password: u.password,
        email: u.email,
        phone: u.phone,
        avatar: u.avatar,
        status: u.status,
      })),
    );

    // 6. 用户-角色 关联
    console.log("[seed] 关联用户-角色...");
    await tx.insert(userRoleTable).values(
      users.map((u) => ({
        userId: u.id,
        roleId: findRoleId(u.roleCode),
      })),
    );

    // 7. 角色-权限 关联
    //    super_admin: 全部权限
    //    admin:      除 delete 之外的权限
    //    user:       仅按钮 list 权限（不授予 API 权限）
    console.log("[seed] 关联角色-权限...");
    const superAdminId = findRoleId("super_admin");
    const adminId = findRoleId("admin");
    const userId = findRoleId("user");

    const rolePermissionRows: { roleId: string; permissionId: string }[] = [];

    for (const p of PERMISSIONS) {
      rolePermissionRows.push({ roleId: superAdminId, permissionId: p.id });
      if (!p.permissionCode.endsWith(":delete")) {
        rolePermissionRows.push({ roleId: adminId, permissionId: p.id });
      }
      if (p.permissionType === 1 && p.permissionCode.endsWith(":list")) {
        rolePermissionRows.push({ roleId: userId, permissionId: p.id });
      }
    }
    await tx.insert(rolePermissionTable).values(rolePermissionRows);

    // 8. 角色-菜单 关联
    //    super_admin / admin: 全部菜单
    //    user:               仅 Dashboard
    console.log("[seed] 关联角色-菜单...");
    const roleMenuRows: { roleId: string; menuId: string }[] = [];
    for (const m of MENUS) {
      roleMenuRows.push({ roleId: superAdminId, menuId: m.id });
      roleMenuRows.push({ roleId: adminId, menuId: m.id });
    }
    roleMenuRows.push({ roleId: userId, menuId: findMenuId("dashboard") });
    await tx.insert(roleMenuTable).values(roleMenuRows);
  });

  console.log("\n[seed] 数据初始化完成！");
  console.log("------------------------------------------------------------");
  console.log("初始账号：");
  console.log("  超级管理员  -> admin / admin123456");
  console.log("  普通用户    -> user  / user123456");
  console.log("------------------------------------------------------------");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] 初始化失败:", err);
    process.exit(1);
  });
