import { type Column, count, isNull, type SQL } from "drizzle-orm";
import type { MySqlTable } from "drizzle-orm/mysql-core";
import db from "../db/index.js";
import type { PaginatedVO } from "../vo/common.vo.js";

/**
 * 软删除过滤条件：过滤掉 deletedAt 不为 null 的记录
 */
export const notDeleted = (table: { deletedAt: Column }): SQL =>
  isNull(table.deletedAt);

interface PaginateOptions {
  page: number;
  pageSize: number;
}

/**
 * 通用分页查询函数
 * 并行执行列表查询和总数查询，返回 PaginatedVO 结构
 */
export async function paginate<T extends MySqlTable>(
  table: T,
  options: PaginateOptions,
  where?: SQL,
): Promise<PaginatedVO<T["$inferSelect"]>> {
  const { page, pageSize } = options;

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(table)
      .where(where)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ total: count() }).from(table).where(where),
  ]);

  return {
    list: rows as T["$inferSelect"][],
    total: totalResult[0].total,
    page,
    pageSize,
  };
}
