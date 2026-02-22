import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database, DBContext } from "../database/database.types.js";
import {
  storeMembers,
  stores,
  type NewStore,
  type NewStoreMember,
  type Store,
  type StoreMemberRole,
} from "../database/schema/index.js";
import type { UpdateStoreDto } from "./dto/update-store.dto.js";

@Injectable()
export class StoresRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async createStore(data: NewStore, db: DBContext = this.db): Promise<Store> {
    const [created] = await db.insert(stores).values(data).returning();
    return created;
  }

  async createStoreMember(
    data: NewStoreMember,
    db: DBContext = this.db,
  ): Promise<void> {
    await db.insert(storeMembers).values(data);
  }

  findActiveStoreById(
    id: number,
    db: DBContext = this.db,
  ): Promise<Store | undefined> {
    return db.query.stores.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
    });
  }

  findActiveMemberRole(
    userId: number,
    storeId: number,
    db: DBContext = this.db,
  ): Promise<{ role: StoreMemberRole } | undefined> {
    return db.query.storeMembers.findFirst({
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
    db: DBContext = this.db,
  ): Promise<Store> {
    const [updated] = await db
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
    db: DBContext = this.db,
  ): Promise<void> {
    await db
      .update(stores)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(stores.id, id));
  }

  findStoreMember(storeId: number, userId: number, db: DBContext = this.db) {
    return db.query.storeMembers.findFirst({
      where: (table) =>
        and(eq(table.storeId, storeId), eq(table.userId, userId)),
    });
  }

  async createMember(
    storeId: number,
    userId: number,
    role: StoreMemberRole,
    db: DBContext = this.db,
  ) {
    const [member] = await db
      .insert(storeMembers)
      .values({
        storeId,
        userId,
        role,
      })
      .returning();

    return member;
  }

  async removeMember(storeId: number, userId: number, db: DBContext = this.db) {
    return db
      .delete(storeMembers)
      .where(
        and(eq(storeMembers.storeId, storeId), eq(storeMembers.userId, userId)),
      )
      .returning();
  }
}
