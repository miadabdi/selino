import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  businessSubscriptions,
  featurePermissions,
  packageFeatures,
  permissions,
  rolePermissions,
  users,
  type NewUser,
  type User,
} from "../database/schema/index";

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

  findAuthenticatedById(id: number, txContext: TXContext = this.db) {
    return txContext.query.users.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
      with: {
        businessMemberships: {
          where: (membership) => eq(membership.isActive, true),
          with: {
            role: true,
            businessAccount: true,
          },
        },
      },
    });
  }

  async listRolePermissionNames(
    roleId: number,
    txContext: TXContext = this.db,
  ): Promise<string[]> {
    const rows = await txContext
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(rolePermissions.roleId, roleId));

    return rows.map((row) => row.name);
  }

  async listEnabledPermissionNames(
    businessAccountId: number,
    txContext: TXContext = this.db,
  ): Promise<string[]> {
    const rows = await txContext
      .select({ name: permissions.name })
      .from(businessSubscriptions)
      .innerJoin(
        packageFeatures,
        eq(packageFeatures.packageId, businessSubscriptions.packageId),
      )
      .innerJoin(
        featurePermissions,
        eq(featurePermissions.featureId, packageFeatures.featureId),
      )
      .innerJoin(
        permissions,
        eq(permissions.id, featurePermissions.permissionId),
      )
      .where(
        and(
          eq(businessSubscriptions.businessAccountId, businessAccountId),
          eq(businessSubscriptions.isActive, true),
        ),
      );

    return rows.map((row) => row.name);
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
