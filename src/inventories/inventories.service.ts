import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { throwHttpError } from "../common/http-error.js";
import type { StockReason } from "../common/stock-reasons.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import {
  products,
  storeInventories,
  storeInventoryTransactions,
  stores,
} from "../database/schema/index.js";
import { CreateInventoryDto } from "./dto/create-inventory.dto.js";
import { RestockInventoryDto } from "./dto/restock-inventory.dto.js";
import { UpdateInventoryDto } from "./dto/update-inventory.dto.js";

@Injectable()
export class InventoriesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(storeId: number, userId: number, dto: CreateInventoryDto) {
    await this.assertStoreExists(storeId);
    await this.assertProductExists(dto.productId);

    const [created] = await this.db
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

    if ((dto.stock ?? 0) > 0) {
      await this.insertTransaction(
        created.id,
        dto.stock ?? 0,
        "restock",
        `inventory:${created.id}:create`,
        userId,
      );
    }

    return created;
  }

  async restock(
    storeId: number,
    inventoryId: number,
    userId: number,
    dto: RestockInventoryDto,
  ) {
    await this.assertInventory(storeId, inventoryId);

    const [updated] = await this.db
      .update(storeInventories)
      .set({
        stock: sql`${storeInventories.stock} + ${dto.qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(storeInventories.id, inventoryId),
          eq(storeInventories.storeId, storeId),
        ),
      )
      .returning();

    await this.insertTransaction(
      inventoryId,
      dto.qty,
      dto.reason,
      `inventory:${inventoryId}:restock`,
      userId,
    );

    return updated;
  }

  async list(storeId: number) {
    await this.assertStoreExists(storeId);

    const rows = await this.db
      .select()
      .from(storeInventories)
      .where(eq(storeInventories.storeId, storeId))
      .orderBy(asc(storeInventories.id));

    return rows.map((row) => ({
      ...row,
      availableStock: row.stock - row.reservedStock,
    }));
  }

  async update(storeId: number, inventoryId: number, dto: UpdateInventoryDto) {
    await this.assertInventory(storeId, inventoryId);

    const [updated] = await this.db
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

    return {
      ...updated,
      availableStock: updated.stock - updated.reservedStock,
    };
  }

  async listTransactions(storeId: number, inventoryId: number) {
    await this.assertInventory(storeId, inventoryId);

    return this.db
      .select()
      .from(storeInventoryTransactions)
      .where(eq(storeInventoryTransactions.storeInventoryId, inventoryId))
      .orderBy(asc(storeInventoryTransactions.id));
  }

  async reserveStockAtomic(
    tx: any,
    inventoryId: number,
    qty: number,
    reference: string,
    changedBy: number,
  ) {
    const result = await tx
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

    if (result.length === 0) {
      throwHttpError(HttpStatus.CONFLICT, "Out of stock");
    }

    await this.insertTransactionWithTx(
      tx,
      inventoryId,
      qty,
      "adjustment",
      reference,
      changedBy,
    );

    return result[0];
  }

  async releaseReservedStockAtomic(
    tx: any,
    inventoryId: number,
    qty: number,
    reason: Extract<StockReason, "cancellation" | "reservation_expired">,
    reference: string,
    changedBy: number,
  ) {
    const result = await tx
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

    if (result.length === 0) {
      throwHttpError(HttpStatus.CONFLICT, "Stock reservation conflict");
    }

    await this.insertTransactionWithTx(
      tx,
      inventoryId,
      -qty,
      reason,
      reference,
      changedBy,
    );

    return result[0];
  }

  async consumeReservedStockAtomic(
    tx: any,
    inventoryId: number,
    qty: number,
    reference: string,
    changedBy: number,
  ) {
    const result = await tx
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

    if (result.length === 0) {
      throwHttpError(HttpStatus.CONFLICT, "Insufficient stock for sale");
    }

    await this.insertTransactionWithTx(
      tx,
      inventoryId,
      -qty,
      "sale",
      reference,
      changedBy,
    );

    return result[0];
  }

  async assertInventory(storeId: number, inventoryId: number) {
    const [inventory] = await this.db
      .select()
      .from(storeInventories)
      .where(
        and(
          eq(storeInventories.id, inventoryId),
          eq(storeInventories.storeId, storeId),
        ),
      )
      .limit(1);

    if (!inventory) {
      throwHttpError(HttpStatus.NOT_FOUND, "Inventory not found");
    }

    return inventory;
  }

  async findInventoryById(inventoryId: number) {
    const [inventory] = await this.db
      .select()
      .from(storeInventories)
      .where(eq(storeInventories.id, inventoryId))
      .limit(1);

    if (!inventory) {
      throwHttpError(
        HttpStatus.NOT_FOUND,
        "Inventory not found",
        "storeInventoryId",
      );
    }

    return inventory;
  }

  private async assertStoreExists(storeId: number) {
    const [store] = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.id, storeId), isNull(stores.deletedAt)))
      .limit(1);

    if (!store) {
      throwHttpError(HttpStatus.NOT_FOUND, "Store not found");
    }
  }

  private async assertProductExists(productId: number) {
    const [product] = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), isNull(products.deletedAt)))
      .limit(1);

    if (!product) {
      throwHttpError(HttpStatus.BAD_REQUEST, "Product not found", "productId");
    }
  }

  private async insertTransaction(
    inventoryId: number,
    change: number,
    reason: StockReason,
    reference: string,
    changedBy: number,
  ) {
    await this.db.insert(storeInventoryTransactions).values({
      storeInventoryId: inventoryId,
      change,
      reason,
      reference,
      changedBy,
    });
  }

  private async insertTransactionWithTx(
    tx: any,
    inventoryId: number,
    change: number,
    reason: StockReason,
    reference: string,
    changedBy: number,
  ) {
    await tx.insert(storeInventoryTransactions).values({
      storeInventoryId: inventoryId,
      change,
      reason,
      reference,
      changedBy,
    });
  }
}
