import { Hono } from "hono";
import { zValidator } from "../middleware/validator.middleware.js";
import auditService from "../service/audit.service.js";
import { auditLogQuerySchema } from "../dto/audit.dto.js";
import { ok } from "../utils/response.js";
import { jwtAuth } from "../middleware/jwtAuth.middleware.js";
import { roleAuth } from "../middleware/roleAuth.middleware.js";

const auditController = new Hono();

/**
 * 获取审计日志列表（需要 API 权限，默认仅管理员可见）
 */
auditController.get(
  "/",
  jwtAuth,
  roleAuth,
  zValidator("query", auditLogQuerySchema),
  async (c) => {
    const query = c.req.valid("query");
    const result = await auditService.getAuditLogs(query);
    return ok(c, result);
  },
);

export default auditController;
