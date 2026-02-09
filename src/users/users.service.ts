import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import { users, type NewUser, type User } from "../database/schema/index.js";

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findById(id: number): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    return result[0];
  }

  async findByPhone(phone: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.phone, phone), isNull(users.deletedAt)))
      .limit(1);

    return result[0];
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const result = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    return result[0];
  }

  async create(data: NewUser): Promise<User> {
    const result = await this.db.insert(users).values(data).returning();
    return result[0];
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async markPhoneVerified(id: number): Promise<void> {
    await this.db
      .update(users)
      .set({ isPhoneVerified: true })
      .where(eq(users.id, id));
  }

  async markEmailVerified(id: number): Promise<void> {
    await this.db
      .update(users)
      .set({ isEmailVerified: true })
      .where(eq(users.id, id));
  }

  /**
   * Find or create a user by email (used for Google OAuth).
   */
  async findOrCreateByEmail(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) return existing;

    return this.create({
      email: data.email,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      phone: data.phone ?? "",
      isEmailVerified: true,
    });
  }
}
