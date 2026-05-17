import { char, timestamp } from "drizzle-orm/mysql-core";
import { v4 as uuidv4 } from "uuid";
export const commonSchema = {
  id: char("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at"),
};
