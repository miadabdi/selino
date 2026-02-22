import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database, DBContext } from "../database/database.types.js";
import { users, type NewUser, type User } from "../database/schema/index.js";

@Injectable()
export class UsersRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  findById(id: number, db: DBContext = this.db): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
    });
  }

  findAuthenticatedById(
    id: number,
    db: DBContext = this.db,
  ): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
      with: {
        storeMemberships: {
          where: (membership) => eq(membership.isActive, true),
        },
      },
    });
  }

  findByPhone(
    phone: string,
    db: DBContext = this.db,
  ): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: (table) => and(eq(table.phone, phone), isNull(table.deletedAt)),
    });
  }

  findByEmail(
    email: string,
    db: DBContext = this.db,
  ): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: (table) => and(eq(table.email, email), isNull(table.deletedAt)),
    });
  }

  async create(data: NewUser, db: DBContext = this.db): Promise<User> {
    const [created] = await db.insert(users).values(data).returning();
    return created;
  }

  async updateLastLogin(id: number, db: DBContext = this.db): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async markPhoneVerified(id: number, db: DBContext = this.db): Promise<void> {
    await db
      .update(users)
      .set({ isPhoneVerified: true })
      .where(eq(users.id, id));
  }

  async markEmailVerified(id: number, db: DBContext = this.db): Promise<void> {
    await db
      .update(users)
      .set({ isEmailVerified: true })
      .where(eq(users.id, id));
  }

  async updateById(
    id: number,
    data: Partial<typeof users.$inferInsert>,
    db: DBContext = this.db,
  ): Promise<User> {
    const [updated] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();

    return updated;
  }
}
