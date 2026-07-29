import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, eq, isNull, ne } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  businessAccounts,
  businessAddresses,
  businessMembers,
  roles,
  type BusinessAccount,
  type BusinessAddress,
  type NewBusinessAccount,
  type NewBusinessAddress,
  type NewBusinessMember,
} from "../database/schema/index";
import type { UpdateBusinessAddressDto } from "./dto/update-business-address.dto.js";
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

  findActiveMembershipByUserId(userId: number, txContext: TXContext = this.db) {
    return txContext.query.businessMembers.findFirst({
      where: (table) => and(eq(table.userId, userId), eq(table.isActive, true)),
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
        legalName: dto.legalName,
        slug,
        type: dto.type,
        description: dto.description,
        registrationNumber: dto.registrationNumber,
        nationalId: dto.nationalId,
        taxId: dto.taxId,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
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

  listBusinessMembers(
    businessAccountId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.businessMembers.findMany({
      where: (table) => eq(table.businessAccountId, businessAccountId),
      with: {
        role: true,
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            profilePictureId: true,
          },
        },
      },
      orderBy: (table, { desc }) => [desc(table.isActive), desc(table.id)],
    });
  }

  findBusinessMemberDetails(
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
      with: {
        role: true,
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            profilePictureId: true,
          },
        },
      },
    });
  }

  findActiveUserById(userId: number, txContext: TXContext = this.db) {
    return txContext.query.users.findFirst({
      where: (table) => and(eq(table.id, userId), isNull(table.deletedAt)),
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

  async updateMember(
    businessAccountId: number,
    userId: number,
    roleName: string | undefined,
    isActive: boolean | undefined,
    txContext: TXContext = this.db,
  ) {
    const role = roleName
      ? await this.findRoleByNameAssert(roleName, txContext)
      : undefined;

    const [updated] = await txContext
      .update(businessMembers)
      .set({
        roleId: role?.id,
        isActive,
      })
      .where(
        and(
          eq(businessMembers.businessAccountId, businessAccountId),
          eq(businessMembers.userId, userId),
        ),
      )
      .returning();

    return updated;
  }

  async deactivateMember(
    businessAccountId: number,
    userId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext
      .update(businessMembers)
      .set({ isActive: false })
      .where(
        and(
          eq(businessMembers.businessAccountId, businessAccountId),
          eq(businessMembers.userId, userId),
          eq(businessMembers.isActive, true),
        ),
      )
      .returning();
  }

  async countOtherActiveManagers(
    businessAccountId: number,
    excludedUserId: number,
    txContext: TXContext = this.db,
  ): Promise<number> {
    const [result] = await txContext
      .select({ value: count() })
      .from(businessMembers)
      .innerJoin(roles, eq(roles.id, businessMembers.roleId))
      .where(
        and(
          eq(businessMembers.businessAccountId, businessAccountId),
          eq(businessMembers.isActive, true),
          eq(roles.name, DEFAULT_MANAGER_ROLE),
          ne(businessMembers.userId, excludedUserId),
        ),
      );

    return result?.value ?? 0;
  }

  listAddresses(
    businessAccountId: number,
    txContext: TXContext = this.db,
  ): Promise<BusinessAddress[]> {
    return txContext.query.businessAddresses.findMany({
      where: (table) =>
        and(
          eq(table.businessAccountId, businessAccountId),
          isNull(table.deletedAt),
        ),
      orderBy: (table, { desc }) => [
        desc(table.isDefault),
        desc(table.createdAt),
      ],
    });
  }

  findAddressById(
    businessAccountId: number,
    addressId: number,
    txContext: TXContext = this.db,
  ): Promise<BusinessAddress | undefined> {
    return txContext.query.businessAddresses.findFirst({
      where: (table) =>
        and(
          eq(table.id, addressId),
          eq(table.businessAccountId, businessAccountId),
          isNull(table.deletedAt),
        ),
    });
  }

  async createAddress(
    data: NewBusinessAddress,
    txContext: TXContext = this.db,
  ): Promise<BusinessAddress> {
    const [created] = await txContext
      .insert(businessAddresses)
      .values(data)
      .returning();
    return created;
  }

  async updateAddress(
    addressId: number,
    dto: UpdateBusinessAddressDto,
    updatedBy: number,
    txContext: TXContext = this.db,
  ): Promise<BusinessAddress> {
    const [updated] = await txContext
      .update(businessAddresses)
      .set({
        ...dto,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(businessAddresses.id, addressId))
      .returning();
    return updated;
  }

  async unsetDefaultAddresses(
    businessAccountId: number,
    exceptAddressId: number | undefined,
    updatedBy: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(businessAddresses)
      .set({
        isDefault: false,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(businessAddresses.businessAccountId, businessAccountId),
          eq(businessAddresses.isDefault, true),
          isNull(businessAddresses.deletedAt),
          exceptAddressId == null
            ? undefined
            : ne(businessAddresses.id, exceptAddressId),
        ),
      );
  }

  async softDeleteAddress(
    addressId: number,
    updatedBy: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(businessAddresses)
      .set({
        isActive: false,
        isDefault: false,
        updatedBy,
        updatedAt: new Date(),
        deletedAt: new Date(),
      })
      .where(eq(businessAddresses.id, addressId));
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

const DEFAULT_MANAGER_ROLE = "manager";
