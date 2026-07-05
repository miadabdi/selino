import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  businessAccounts,
  businessMembers,
  roles,
  type BusinessAccount,
  type NewBusinessAccount,
  type NewBusinessMember,
} from "../database/schema/index";
import type { UpdateBusinessAccountDto } from "./dto/update-business-account.dto";

@Injectable()
export class BusinessAccountsRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async createBusinessAccount(
    data: NewBusinessAccount,
    txContext: TXContext = this.db,
  ): Promise<BusinessAccount> {
    const [created] = await txContext
      .insert(businessAccounts)
      .values(data)
      .returning();
    return created;
  }

  async createBusinessMember(
    data: NewBusinessMember,
    txContext: TXContext = this.db,
  ) {
    const [member] = await txContext
      .insert(businessMembers)
      .values(data)
      .returning();
    return member;
  }

  findActiveBusinessAccountById(
    id: number,
    txContext: TXContext = this.db,
  ): Promise<BusinessAccount | undefined> {
    return txContext.query.businessAccounts.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
    });
  }

  findRoleByName(name: string, txContext: TXContext = this.db) {
    return txContext.query.roles.findFirst({
      where: (table) => eq(table.name, name),
    });
  }

  async findRoleByNameAssert(name: string, txContext: TXContext = this.db) {
    const role = await this.findRoleByName(name, txContext);

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    return role;
  }

  async findActiveMemberRole(
    userId: number,
    businessAccountId: number,
    txContext: TXContext = this.db,
  ): Promise<{ role: { name: string } } | undefined> {
    return txContext.query.businessMembers.findFirst({
      columns: {},
      with: {
        role: {
          columns: { name: true },
        },
      },
      where: (table) =>
        and(
          eq(table.userId, userId),
          eq(table.businessAccountId, businessAccountId),
          eq(table.isActive, true),
        ),
    });
  }

  async updateBusinessAccountById(
    id: number,
    dto: UpdateBusinessAccountDto,
    name: string,
    slug: string | null,
    logoFileId: number | null,
    txContext: TXContext = this.db,
  ): Promise<BusinessAccount> {
    const [updated] = await txContext
      .update(businessAccounts)
      .set({
        name,
        slug,
        type: dto.type,
        description: dto.description,
        logoFileId,
        updatedAt: new Date(),
      })
      .where(eq(businessAccounts.id, id))
      .returning();

    return updated;
  }

  async softDeleteBusinessAccountById(
    id: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(businessAccounts)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(businessAccounts.id, id));
  }

  findBusinessMember(
    businessAccountId: number,
    userId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.businessMembers.findFirst({
      where: (table) =>
        and(
          eq(table.businessAccountId, businessAccountId),
          eq(table.userId, userId),
        ),
    });
  }

  async createMember(
    businessAccountId: number,
    userId: number,
    roleName: string,
    txContext: TXContext = this.db,
  ) {
    const role = await this.findRoleByNameAssert(roleName, txContext);

    return this.createBusinessMember(
      {
        businessAccountId,
        userId,
        roleId: role.id,
      },
      txContext,
    );
  }

  async removeMember(
    businessAccountId: number,
    userId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext
      .delete(businessMembers)
      .where(
        and(
          eq(businessMembers.businessAccountId, businessAccountId),
          eq(businessMembers.userId, userId),
        ),
      )
      .returning();
  }

  async ensureRole(name: string, txContext: TXContext = this.db) {
    const existing = await this.findRoleByName(name, txContext);

    if (existing) {
      return existing;
    }

    const [created] = await txContext
      .insert(roles)
      .values({
        name,
        description: `${name} role`,
      })
      .returning();

    return created;
  }
}
