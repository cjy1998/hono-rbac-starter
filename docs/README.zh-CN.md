# hono-rbac-starter

中文 | [English](../README.md)

一个基于 **Hono + TypeScript** 的后端快速启动模板，集成了：

- [Hono](https://hono.dev/) - 极简、类型友好的 Web 框架
- [Drizzle ORM](https://orm.drizzle.team/) + MySQL - TypeScript-first 的 ORM
- [Zod](https://zod.dev/) - Schema 校验 + 类型推导
- [Hono JWT](https://hono.dev/docs/helpers/jwt) - JWT 签发与校验
- [Argon2](https://github.com/ranisalt/node-argon2) - 现代密码哈希算法
- [Winston](https://github.com/winstonjs/winston) + [winston-daily-rotate-file](https://github.com/winstonjs/winston-daily-rotate-file) - 结构化日志、按日期切分、自动 gzip 压缩
- [ioredis](https://github.com/redis/ioredis) - Redis 客户端，用于角色权限缓存
- 安全加固中间件：安全响应头、登录限流（Redis 滑动窗口）、XSS 基础输入拦截
- 分层架构：`controller / server / dto / vo / db / middleware`
- 统一异常处理 + 统一响应格式 + 请求级 `requestId` 链路追踪
- 完整 RBAC 表结构：用户 / 角色 / 权限 / 菜单四实体 + 三张关联表

> 想看完整的实现思路与每个模块的讲解？请阅读 [`TUTORIAL.md`](../TUTORIAL.md)。

---

## 目录结构

```
hono-test/
├── drizzle/                 drizzle-kit 生成的迁移 SQL
├── logs/                    运行时日志（gitignore，按日期切分 + gzip 压缩）
|── scripts/
|   ├── seed.ts          初始化数据脚本
├── src/
│   ├── index.ts             应用入口（路由挂载、全局异常、请求日志）
│   ├── redis.ts             Redis 连接实例（ioredis）
│   ├── controller/           接口层
│   ├── service/             业务层
│   │   ├── user.service.ts    用户业务
│   │   └── permissions.ts    权限/角色查询服务（供 roleAuth 使用）
│   ├── db/                  drizzle 实例 + schema
│   │   ├── index.ts         drizzle 连接实例
│   │   ├── schema/          表结构定义（每个实体或关系一张文件）
│   │   │   ├── common.ts      所有表的公共字段（id / createdAt / updatedAt / deletedAt）
│   │   │   ├── users.ts       用户表
│   │   │   ├── roles.ts       角色表
│   │   │   ├── permissions.ts  权限表（按钮/API）
│   │   │   ├── menus.ts       菜单表（从权限表分离）
│   │   │   ├── user_role.ts    用户-角色 关联表
│   │   │   ├── role_permission.ts  角色-权限 关联表
│   │   │   └── role_menu.ts    角色-菜单 关联表
│   │   └── relations.ts      所有表之间的关系定义
│   ├── dto/                 入参 + zod schema
│   │   ├── common.dto.ts     公共分页 DTO
│   │   └── user.dto.ts       用户 DTO
│   ├── vo/                  出参视图对象
│   │   ├── common.vo.ts      公共分页 VO
│   │   ├── roles.vo.ts       角色 VO
│   │   └── user.vo.ts        用户 VO
│   ├── middleware/          jwtAuth / roleAuth / redis.middleware / zValidator / requestLogger
│   ├── exceptions/          自定义异常
│   ├── types/               Hono Variables 等共享类型
│   ├── utils/               常量、统一响应、logger、查询工具
│   │   ├── const.ts          HTTP_STATUS 常量
│   │   ├── logger.ts         Winston logger
│   │   ├── query.ts          公共查询工具（notDeleted、paginate）
│   │   ├── response.ts       统一响应 ok / fail
│   │   └── token.ts          Bearer token 解析 + JWT 黑名单 key 工具
│   ├── env.ts               运行时环境变量读取与校验
│   └── env.d.ts             process.env 类型
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

---

## 数据库设计（RBAC）

本项目实现了完整的 **RBAC（基于角色的访问控制）** 表结构，包含 7 张表：

```mermaid
erDiagram
    users {
        string id PK "UUID，主键"
        string username UK "用户名，唯一"
        string nickname "昵称"
        string password "Argon2 加密后的密码"
        string email UK "邮箱，唯一"
        string phone "手机号"
        string avatar "头像 URL"
        tinyint status "0-禁用 1-启用"
        timestamp createdAt "创建时间"
        timestamp updatedAt "更新时间"
        timestamp deletedAt "软删除时间，可为空"
    }

    roles {
        string id PK "UUID，主键"
        string roleName "角色名称"
        string roleCode UK "角色编码，唯一"
        int sortOrder "排序，越小越靠前"
        tinyint status "0-禁用 1-启用"
        string remark "备注"
        timestamp createdAt "创建时间"
        timestamp updatedAt "更新时间"
        timestamp deletedAt "软删除时间"
    }

    permissions {
        string id PK "UUID，主键"
        string permissionName "权限名称，如'用户列表'"
        string permissionCode UK "权限编码，如'user:list'，唯一"
        tinyint permissionType "1-按钮/操作 2-API 3-数据权限"
        string resource "API 资源路径（permissionType=2 时使用）"
        string method "HTTP 方法"
        tinyint status "0-禁用 1-启用"
        string remark "备注"
        timestamp createdAt "创建时间"
        timestamp updatedAt "更新时间"
        timestamp deletedAt "软删除时间"
    }

    menus {
        string id PK "UUID，主键"
        string parentId "父菜单 ID，顶级为 '0'"
        string menuName "菜单名称"
        tinyint menuType "1-目录 2-菜单 3-外链"
        string path "路由路径"
        string component "前端组件路径"
        string icon "图标"
        string redirect "重定向地址"
        string permissionCode "关联的权限编码"
        tinyint visible "0-隐藏 1-显示"
        tinyint keepAlive "0-不缓存 1-缓存"
        int sortOrder "排序"
        tinyint status "0-禁用 1-启用"
        timestamp createdAt "创建时间"
        timestamp updatedAt "更新时间"
        timestamp deletedAt "软删除时间"
    }

    user_role {
        string userId PK,FK "关联 user 的 UUID"
        string roleId PK,FK "关联 role 的 UUID"
        timestamp createdAt "创建时间"
    }

    role_permission {
        string roleId PK,FK "关联 role 的 UUID"
        string permissionId PK,FK "关联 permission 的 UUID"
        timestamp createdAt "创建时间"
    }

    role_menu {
        string roleId PK,FK "关联 role 的 UUID"
        string menuId PK,FK "关联 menu 的 UUID"
        timestamp createdAt "创建时间"
    }

    users ||--o{ user_role : "一个用户可以有多个角色"
    roles ||--o{ user_role : "一个角色可以分配给多个用户"
    roles ||--o{ role_permission : "一个角色可以拥有多个权限"
    permissions ||--o{ role_permission : "一个权限可以分配给多个角色"
    roles ||--o{ role_menu : "一个角色可以关联多个菜单"
    menus ||--o{ role_menu : "一个菜单可以分配给多个角色"
```

**设计要点**：

- 所有主键均使用 **UUID v4**（`char(36)`），跨环境迁移不易冲突
- 所有表均包含 `createdAt / updatedAt / deletedAt`（软删除），通过 `commonSchema` 统一定义
- **菜单从权限表分离**：菜单（menus）专注于前端路由与组件，权限（permissions）专注于按钮操作与 API 鉴权，解除耦合
- 三张关联表（user_role / role_permission / role_menu）均无 id 主键，使用联合主键（roleId + XxxId）

---

## 快速开始

### 1. 环境要求

- Node.js >= 20
- MySQL >= 8.0
- Redis >= 6.0
- 推荐使用 [pnpm](https://pnpm.io/)

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```dotenv
# MySQL 连接串
DATABASE_URL=mysql://用户名:密码@localhost:3306/hono_test

# JWT 密钥与过期时间
JWT_SECRET=请改成你自己的随机长字符串
JWT_EXPIRES_IN=24h

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 可选：日志相关
# NODE_ENV=production      # 生产环境会让控制台输出也走 JSON 格式
# LOG_LEVEL=info           # error / warn / info / http / debug / silly
# LOG_DIR=/var/log/hono    # 自定义日志目录，默认 <cwd>/logs

# 可选：CORS 相关
ALLOWED_ORIGINS=*

# 可选：登录限流
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW_SEC=60
```

详见`.env.example`

### 4. 创建数据库并执行迁移

```bash
# 提前在 MySQL 里建库
mysql -uroot -p -e "CREATE DATABASE hono_test DEFAULT CHARSET utf8mb4;"

# 根据 src/db/schema/ 生成迁移 SQL
pnpm db:g

# 把迁移应用到数据库
pnpm db:m

# 初始化种子数据（角色/权限/菜单/超级管理员账号）
pnpm db:seed
```

### 5. 启动开发服务

```bash
pnpm dev
```

服务默认运行在 <http://localhost:3000>。

---

## NPM 脚本

| 命令           | 说明                                                         |
| -------------- | ------------------------------------------------------------ |
| `pnpm dev`     | `tsx watch src/index.ts`，开发模式 + 热更新                  |
| `pnpm build`   | `tsc`，编译 TypeScript 到 `dist/`                            |
| `pnpm start`   | `node dist/index.js`，运行编译后的产物                       |
| `pnpm db:g`    | `drizzle-kit generate`，根据 schema 生成迁移                 |
| `pnpm db:m`    | `drizzle-kit migrate`，把迁移应用到 MySQL                    |
| `pnpm db:seed` | `tsx scripts/seed.ts`，初始化种子数据（角色/权限/菜单/用户） |

---

## 初始账号

执行 `pnpm db:seed` 后会自动插入以下账号：

| 角色       | 用户名  | 密码          | 说明                    |
| ---------- | ------- | ------------- | ----------------------- |
| 超级管理员 | `admin` | `admin123456` | 拥有全部权限和菜单      |
| 普通用户   | `user`  | `user123456`  | 仅可访问 Dashboard 页面 |

---

## API 一览

### 用户接口

| Method | Path                 | 鉴权 | 入参                                             | 说明                                  |
| ------ | -------------------- | ---- | ------------------------------------------------ | ------------------------------------- |
| POST   | `/user/login`        | -    | `{ email, password }` (json)                     | 登录，返回 user + token（已接入限流） |
| POST   | `/user/logout`       | JWT  | -                                                | 登出，将当前 token 加入黑名单         |
| POST   | `/user`              | JWT  | `{ username, nickname, email, password }` (json) | 创建用户                              |
| GET    | `/user`              | JWT  | `?page&pageSize&username&email` (query)          | 分页 + 用户名/邮箱搜索                |
| GET    | `/user/:id`          | JWT  | `id` (param，UUID 格式)                          | 查询单个用户                          |
| PUT    | `/user/:id`          | JWT  | `id` (param) + 用户字段（json，部分可选）        | 更新用户信息，同时清理 Redis 缓存     |
| PUT    | `/user/:id/password` | JWT  | `id` (param) + `{ password }` (json)             | 修改密码，同时清理 Redis 缓存         |
| DELETE | `/user/:id`          | JWT  | `id` (param，UUID 格式)                          | 软删除用户，同时清理 Redis 缓存       |
| POST   | `/user/:id/roles`    | JWT  | `id` (param) + `{ roleIds: string[] }` (json)    | 批量绑定用户-角色（幂等）             |
| DELETE | `/user/:id/roles`    | JWT  | `id` (param) + `{ roleIds: string[] }` (json)    | 批量解绑用户-角色                     |

### 角色接口

| Method | Path                    | 鉴权 | 入参                                        | 说明              |
| ------ | ----------------------- | ---- | ------------------------------------------- | ----------------- |
| POST   | `/role`                 | JWT  | role 字段（json）                           | 创建角色          |
| GET    | `/role`                 | JWT  | 角色筛选 + 分页（query）                    | 角色列表          |
| GET    | `/role/:id`             | JWT  | `id` (param)                                | 查询单个角色      |
| PUT    | `/role/:id`             | JWT  | `id` + role 字段（json）                    | 更新角色          |
| DELETE | `/role/:id`             | JWT  | `id` (param)                                | 软删除角色        |
| POST   | `/role/:id/permissions` | JWT  | `id` + `{ permissionIds: string[] }` (json) | 批量绑定角色-权限 |
| DELETE | `/role/:id/permissions` | JWT  | `id` + `{ permissionIds: string[] }` (json) | 批量解绑角色-权限 |
| POST   | `/role/:id/menus`       | JWT  | `id` + `{ menuIds: string[] }` (json)       | 批量绑定角色-菜单 |
| DELETE | `/role/:id/menus`       | JWT  | `id` + `{ menuIds: string[] }` (json)       | 批量解绑角色-菜单 |

### 权限与菜单接口

| Method | Path           | 鉴权 | 说明       |
| ------ | -------------- | ---- | ---------- |
| CRUD   | `/permissions` | JWT  | 权限管理   |
| CRUD   | `/menu`        | JWT  | 菜单管理   |
| GET    | `/menu/tree`   | JWT  | 菜单树查询 |

> 所有接口的响应都遵循统一格式：
>
> ```jsonc
> // 成功
> { "success": true,  "data": { ... }, "errorCode": 0,   "message": "ok",          "responseId": "<uuid>" }
>
> // 失败
> { "success": false, "data": null,    "errorCode": 401, "message": "token 已过期", "responseId": "<uuid>" }
> ```
>
> `responseId` 与请求级 `x-request-id` 保持一致，便于前端 / 网关 / 日志系统串联一次完整请求链路。

---

## 联调示例

```bash
# 1. 登录
curl -X POST http://localhost:3000/user/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123456"}'

# 2. 带 token 访问受保护接口
curl http://localhost:3000/user \
  -H 'Authorization: Bearer <第一步拿到的 token>'

# 3. 查询单个用户（id 为 UUID）
curl http://localhost:3000/user/<uuid> \
  -H 'Authorization: Bearer <token>'

# 4. 登出（当前 token 会写入 Redis 黑名单，之后不可继续使用）
curl -X POST http://localhost:3000/user/logout \
  -H 'Authorization: Bearer <token>'
```

---

## 中间件

项目通过 Hono 中间件实现鉴权、缓存与请求追踪等横切关注点，均位于 `src/middleware/`：

| 中间件             | 说明                                                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jwtAuth`          | JWT 解析与校验，校验通过后把用户 payload 写入 `c.set("user", payload)`，把原始 token 写入 `c.set("token", token)`；同时检查 Redis 黑名单，避免已登出的 token 在自然过期前继续使用 |
| `roleAuth`         | 角色 / 权限鉴权，基于 `c.get("user")` 调用 `permissions` 服务校验当前用户是否具备指定角色编码或 API 权限                                                                          |
| `redis.middleware` | 角色权限缓存中间件，命中 Redis 缓存时直接复用，未命中则回源数据库并回写缓存，降低 RBAC 查询压力                                                                                   |
| `securityHeaders`  | 全局写入安全响应头（CSP、X-Frame-Options、X-Content-Type-Options 等）                                                                                                             |
| `xssProtection`    | 对 query/param/json 做基础 XSS payload 检测，命中后拒绝请求                                                                                                                       |
| `rateLimit`        | 基于 Redis ZSet 滑动窗口限流，当前用于 `/user/login` 防暴力破解                                                                                                                   |
| `zValidator`       | 基于 `@hono/zod-validator` 的请求参数校验，校验失败抛出统一的 `ValidationException`                                                                                               |
| `requestLogger`    | 生成 / 透传 `x-request-id`，并按请求维度记录链路日志                                                                                                                              |

### Redis 缓存

- `src/redis.ts` 基于 `ioredis` 创建单例连接，读取 `REDIS_HOST / REDIS_PORT / REDIS_PASSWORD / REDIS_DB` 等环境变量
- `redis.middleware` 配合 `roleAuth` 使用，缓存用户的角色与权限集合，避免每次请求都查表
- 缓存失效
  - 用户 `update / delete / change password` 后，controller 会调用 `clearUserCache` 删除 `user:{id}` 和 `user:roles:{id}`，下一次读取会回源数据库
  - 用户登出时，当前 token 会以 `jwt:blacklist:<sha256(token)>` 写入 Redis，TTL 等于 JWT 剩余有效期（`exp - now`），过期后自动释放，避免 Redis 残留已自然过期的 token

---

## 日志系统

项目接入了基于 Winston 的工程化日志方案，所有日志都通过 `src/utils/logger.ts` 暴露的 `logger` 写入，业务代码里 **不要再使用 `console.log`**。

### 输出位置

| 通道                              | 内容                   | 格式                               |
| --------------------------------- | ---------------------- | ---------------------------------- |
| 终端控制台                        | 全量（按 `LOG_LEVEL`） | 开发环境：彩色单行；生产环境：JSON |
| `logs/application-YYYY-MM-DD.log` | 全量（按 `LOG_LEVEL`） | JSON，便于采集                     |
| `logs/error-YYYY-MM-DD.log`       | 仅 `error` 级别        | JSON                               |

### 自动轮转策略

- 按日期切分：每天一个文件
- 单文件超过 `20m` 立即滚动
- 跨天的旧文件自动 `gzip` 压缩为 `.log.gz`
- 全量日志保留 `14d`，错误日志保留 `30d`
- 由 `.<hash>-audit.json` 记录轮转状态，超期文件自动删除

### 环境变量

| 变量        | 默认值                     | 说明                                     |
| ----------- | -------------------------- | ---------------------------------------- |
| `LOG_LEVEL` | 开发 `debug` / 生产 `info` | winston 标准级别                         |
| `LOG_DIR`   | `<cwd>/logs`               | 自定义日志目录（容器环境通常挂载持久卷） |
| `NODE_ENV`  | -                          | 设为 `production` 时控制台也输出 JSON    |

### 请求链路追踪

`requestLogger` 中间件会给每个请求生成（或透传上游的）`x-request-id`，并写入：

- 响应头 `x-request-id`，便于前端 / 网关串联
- 该请求所有后续日志的 `requestId` 字段，便于在日志系统里按 ID 过滤一条完整链路

终端示例：

```
[2026-05-16 22:14:45.690] info: request received {"requestId":"3c9d6ba5...","method":"GET","path":"/user/999",...}
[2026-05-16 22:14:45.691] warn: token is required {"requestId":"3c9d6ba5...","status":401}
[2026-05-16 22:14:45.691] info: request completed {"requestId":"3c9d6ba5...","method":"GET","path":"/user/999","status":200,"durationMs":1}
```

### 在业务里使用

```ts
import { logger } from "./utils/logger.js";

logger.info("user created", { userId, email });
logger.warn("rate limit hit", { ip, route });
logger.error("payment failed", { orderId, error: err });
```

`logger.error` 直接传 `Error` 对象时，会自动展开堆栈到日志中。

---

## 进一步阅读

- 完整教程（按模块讲解）：[`TUTORIAL.md`](../TUTORIAL.md)
- Hono 官方文档：<https://hono.dev/>
- Drizzle ORM 文档：<https://orm.drizzle.team/>
- Zod 文档：<https://zod.dev/>

---

## License

MIT
