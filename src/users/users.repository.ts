import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import { users, type NewUser, type User } from "../database/schema/index";

@Injectable()
export class UsersRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  findById(
    id: number,
    txContext: TXContext = this.db,
  ): Promise<User | undefined> {
    return txContext.query.users.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
    });
  }

  findAuthenticatedById(
    id: number,
    txContext: TXContext = this.db,
  ): Promise<User | undefined> {
    return txContext.query.users.findFirst({
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
    txContext: TXContext = this.db,
  ): Promise<User | undefined> {
    return txContext.query.users.findFirst({
      where: (table) => and(eq(table.phone, phone), isNull(table.deletedAt)),
    });
  }

  findByEmail(
    email: string,
    txContext: TXContext = this.db,
  ): Promise<User | undefined> {
    return txContext.query.users.findFirst({
      where: (table) => and(eq(table.email, email), isNull(table.deletedAt)),
    });
  }

  async create(data: NewUser, txContext: TXContext = this.db): Promise<User> {
    const [created] = await txContext.insert(users).values(data).returning();
    return created;
  }

  async updateLastLogin(
    id: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async markPhoneVerified(
    id: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(users)
      .set({ isPhoneVerified: true })
      .where(eq(users.id, id));
  }

  async markEmailVerified(
    id: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(users)
      .set({ isEmailVerified: true })
      .where(eq(users.id, id));
  }

  async updateById(
    id: number,
    data: Partial<typeof users.$inferInsert>,
    txContext: TXContext = this.db,
  ): Promise<User> {
    const [updated] = await txContext
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();

    return updated;
  }
}
