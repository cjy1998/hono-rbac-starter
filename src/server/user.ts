import { eq, like, or } from "drizzle-orm";
import db from "../db/index.js";
import { usersTable } from "../db/schema.js";
import type { CreateUserDTO, UserQueryDTO } from "../dto/user.dto.js";

class UserServer {
  async getUsers(query: UserQueryDTO) {
    const { page, pageSize, keyword } = query;
    const where = keyword
      ? or(
          like(usersTable.name, `%${keyword}%`),
          like(usersTable.email, `%${keyword}%`),
        )
      : undefined;

    return await db
      .select()
      .from(usersTable)
      .where(where)
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  }

  async getUserById(id: number) {
    const rows = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);
    return rows[0];
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
}

export default new UserServer();
