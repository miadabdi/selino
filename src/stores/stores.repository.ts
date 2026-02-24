import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  storeMembers,
  stores,
  type NewStore,
  type NewStoreMember,
  type Store,
  type StoreMemberRole,
} from "../database/schema/index";
import type { UpdateStoreDto } from "./dto/update-store.dto";

@Injectable()
export class StoresRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async createStore(
    data: NewStore,
    txContext: TXContext = this.db,
  ): Promise<Store> {
    const [created] = await txContext.insert(stores).values(data).returning();
    return created;
  }

  async createStoreMember(
    data: NewStoreMember,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext.insert(storeMembers).values(data);
  }

  findActiveStoreById(
    id: number,
    txContext: TXContext = this.db,
  ): Promise<Store | undefined> {
    return txContext.query.stores.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
    });
  }

  findActiveMemberRole(
    userId: number,
    storeId: number,
    txContext: TXContext = this.db,
  ): Promise<{ role: StoreMemberRole } | undefined> {
    return txContext.query.storeMembers.findFirst({
      columns: { role: true },
      where: (table) =>
        and(
          eq(table.userId, userId),
          eq(table.storeId, storeId),
          eq(table.isActive, true),
        ),
    });
  }

  async updateStoreById(
    id: number,
    dto: UpdateStoreDto,
    name: string,
    slug: string | null,
    logoFileId: number | null,
    txContext: TXContext = this.db,
  ): Promise<Store> {
    const [updated] = await txContext
      .update(stores)
      .set({
        name,
        slug,
        description: dto.description,
        logoFileId,
        updatedAt: new Date(),
      })
      .where(eq(stores.id, id))
      .returning();

    return updated;
  }

  async softDeleteStoreById(
    id: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(stores)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(stores.id, id));
  }

  findStoreMember(
    storeId: number,
    userId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext.query.storeMembers.findFirst({
      where: (table) =>
        and(eq(table.storeId, storeId), eq(table.userId, userId)),
    });
  }

  async createMember(
    storeId: number,
    userId: number,
    role: StoreMemberRole,
    txContext: TXContext = this.db,
  ) {
    const [member] = await txContext
      .insert(storeMembers)
      .values({
        storeId,
        userId,
        role,
      })
      .returning();

    return member;
  }

  async removeMember(
    storeId: number,
    userId: number,
    txContext: TXContext = this.db,
  ) {
    return txContext
      .delete(storeMembers)
      .where(
        and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, userId)),
      )
      .returning();
  }
}
