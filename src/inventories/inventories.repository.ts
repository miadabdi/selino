import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
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
    txContext: TXContext = this.db,
  ) {
    const [created] = await txContext
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
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
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

  listByStoreId(storeId: number, txContext: TXContext = this.db) {
    return txContext.query.storeInventories.findMany({
      where: (table) => eq(table.storeId, storeId),
      orderBy: (table) => [asc(table.id)],
    });
  }

  async updateById(
    storeId: number,
    inventoryId: number,
    dto: UpdateInventoryDto,
    txContext: TXContext = this.db,
  ) {
    const [updated] = await txContext
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
    txContext: TXContext = this.db,
  ) {
    return txContext
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
    txContext: TXContext = this.db,
  ) {
    return txContext
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
    txContext: TXContext = this.db,
  ) {
    return txContext
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
    txContext: TXContext = this.db,
  ) {
    return txContext.query.storeInventories.findFirst({
      where: (table) =>
        and(eq(table.id, inventoryId), eq(table.storeId, storeId)),
    });
  }

  findInventoryById(inventoryId: number, txContext: TXContext = this.db) {
    return txContext.query.storeInventories.findFirst({
      where: (table) => eq(table.id, inventoryId),
    });
  }

  findActiveStoreById(storeId: number, txContext: TXContext = this.db) {
    return txContext.query.stores.findFirst({
      columns: { id: true },
      where: (table) => and(eq(table.id, storeId), isNull(table.deletedAt)),
    });
  }

  findActiveProductById(productId: number, txContext: TXContext = this.db) {
    return txContext.query.products.findFirst({
      columns: { id: true },
      where: (table) => and(eq(table.id, productId), isNull(table.deletedAt)),
    });
  }
}
