import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, DBContext } from "../database/database.types";
import { storeInventories } from "../database/schema/index";
import type { CreateInventoryDto } from "./dto/create-inventory.dto";
import type { UpdateInventoryDto } from "./dto/update-inventory.dto";

@Injectable()
export class InventoriesRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async create(
    storeId: number,
    userId: number,
    dto: CreateInventoryDto,
    db: DBContext = this.db,
  ) {
    const [created] = await db
      .insert(storeInventories)
      .values({
        storeId,
        productId: dto.productId,
        price: dto.price,
        stock: dto.stock ?? 0,
        minOrderQty: dto.minOrderQty ?? 1,
        maxOrderQty: dto.maxOrderQty ?? null,
        isActive: dto.isActive ?? true,
        visible: dto.visible ?? true,
        createdBy: userId,
      })
      .returning();

    return created;
  }

  async restock(
    storeId: number,
    inventoryId: number,
    qty: number,
    db: DBContext = this.db,
  ) {
    const [updated] = await db
      .update(storeInventories)
      .set({
        stock: sql`${storeInventories.stock} + ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(storeInventories.id, inventoryId),
          eq(storeInventories.storeId, storeId),
        ),
      )
      .returning();

    return updated;
  }

  listByStoreId(storeId: number, db: DBContext = this.db) {
    return db.query.storeInventories.findMany({
      where: (table) => eq(table.storeId, storeId),
      orderBy: (table) => [asc(table.id)],
    });
  }

  async updateById(
    storeId: number,
    inventoryId: number,
    dto: UpdateInventoryDto,
    db: DBContext = this.db,
  ) {
    const [updated] = await db
      .update(storeInventories)
      .set({
        price: dto.price,
        minOrderQty: dto.minOrderQty,
        maxOrderQty: dto.maxOrderQty,
        isActive: dto.isActive,
        visible: dto.visible,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(storeInventories.id, inventoryId),
          eq(storeInventories.storeId, storeId),
        ),
      )
      .returning();

    return updated;
  }

  async reserveStock(
    inventoryId: number,
    qty: number,
    db: DBContext = this.db,
  ) {
    return db
      .update(storeInventories)
      .set({
        reservedStock: sql`${storeInventories.reservedStock} + ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(storeInventories.id, inventoryId),
          sql`${storeInventories.stock} - ${storeInventories.reservedStock} >= ${qty}`,
        ),
      )
      .returning();
  }

  async releaseReservedStock(
    inventoryId: number,
    qty: number,
    db: DBContext = this.db,
  ) {
    return db
      .update(storeInventories)
      .set({
        reservedStock: sql`${storeInventories.reservedStock} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(storeInventories.id, inventoryId),
          sql`${storeInventories.reservedStock} >= ${qty}`,
        ),
      )
      .returning();
  }

  async consumeReservedStock(
    inventoryId: number,
    qty: number,
    db: DBContext = this.db,
  ) {
    return db
      .update(storeInventories)
      .set({
        stock: sql`${storeInventories.stock} - ${qty}`,
        reservedStock: sql`${storeInventories.reservedStock} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(storeInventories.id, inventoryId),
          sql`${storeInventories.stock} >= ${qty}`,
          sql`${storeInventories.reservedStock} >= ${qty}`,
        ),
      )
      .returning();
  }

  findInventoryByStoreAndId(
    storeId: number,
    inventoryId: number,
    db: DBContext = this.db,
  ) {
    return db.query.storeInventories.findFirst({
      where: (table) =>
        and(eq(table.id, inventoryId), eq(table.storeId, storeId)),
    });
  }

  findInventoryById(inventoryId: number, db: DBContext = this.db) {
    return db.query.storeInventories.findFirst({
      where: (table) => eq(table.id, inventoryId),
    });
  }

  findActiveStoreById(storeId: number, db: DBContext = this.db) {
    return db.query.stores.findFirst({
      columns: { id: true },
      where: (table) => and(eq(table.id, storeId), isNull(table.deletedAt)),
    });
  }

  findActiveProductById(productId: number, db: DBContext = this.db) {
    return db.query.products.findFirst({
      columns: { id: true },
      where: (table) => and(eq(table.id, productId), isNull(table.deletedAt)),
    });
  }
}
