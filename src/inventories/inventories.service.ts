import { subject } from "@casl/ability";
import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { Action, CaslAbilityFactory } from "../auth/casl/index.js";
import type { AuthenticatedUser } from "../auth/interfaces/index.js";
import { throwHttpError } from "../common/http-error.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import { storeInventories } from "../database/schema/index.js";
import { CreateInventoryDto } from "./dto/create-inventory.dto.js";
import { RestockInventoryDto } from "./dto/restock-inventory.dto.js";
import { UpdateInventoryDto } from "./dto/update-inventory.dto.js";
import { StoreInventoryTransactionsService } from "./store-inventory-transactions.service.js";

@Injectable()
export class InventoriesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly storeInventoryTransactionsService: StoreInventoryTransactionsService,
  ) {}

  private assertInventoryCasl(
    user: AuthenticatedUser,
    action: Action,
    storeId: number,
  ) {
    const ability = this.caslAbilityFactory.createForUser(user);
    const allowed = ability.can(action, subject("Inventory", { storeId }));

    if (!allowed) {
      throwHttpError(
        HttpStatus.FORBIDDEN,
        "You do not have permission for this action",
      );
    }
  }

  async create(
    storeId: number,
    user: AuthenticatedUser,
    dto: CreateInventoryDto,
  ) {
    this.assertInventoryCasl(user, Action.Create, storeId);
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
        createdBy: user.id,
      })
      .returning();

    if ((dto.stock ?? 0) > 0) {
      await this.storeInventoryTransactionsService.create(
        created.id,
        dto.stock ?? 0,
        "restock",
        `inventory:${created.id}:create`,
        user.id,
      );
    }

    return created;
  }

  async restock(
    storeId: number,
    inventoryId: number,
    user: AuthenticatedUser,
    dto: RestockInventoryDto,
  ) {
    this.assertInventoryCasl(user, Action.Update, storeId);
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

    await this.storeInventoryTransactionsService.create(
      inventoryId,
      dto.qty,
      dto.reason,
      `inventory:${inventoryId}:restock`,
      user.id,
    );

    return updated;
  }

  async list(storeId: number) {
    await this.assertStoreExists(storeId);

    const rows = await this.db.query.storeInventories.findMany({
      where: (table) => eq(table.storeId, storeId),
      orderBy: (table) => [asc(table.id)],
    });

    return rows;
  }

  async update(
    storeId: number,
    inventoryId: number,
    user: AuthenticatedUser,
    dto: UpdateInventoryDto,
  ) {
    this.assertInventoryCasl(user, Action.Update, storeId);
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

    return updated;
  }

  async listTransactions(storeId: number, inventoryId: number) {
    await this.assertInventory(storeId, inventoryId);

    return this.storeInventoryTransactionsService.listByInventoryId(
      inventoryId,
    );
  }

  async reserveStock(inventoryId: number, qty: number) {
    const result = await this.db
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

    return result[0];
  }

  async releaseReservedStock(inventoryId: number, qty: number) {
    const result = await this.db
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

    await this.storeInventoryTransactionsService.createWithTx(
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
    const inventory = await this.db.query.storeInventories.findFirst({
      where: (table) =>
        and(eq(table.id, inventoryId), eq(table.storeId, storeId)),
    });

    if (!inventory) {
      throwHttpError(HttpStatus.NOT_FOUND, "Inventory not found");
    }

    return inventory;
  }

  async findInventoryById(inventoryId: number) {
    const inventory = await this.db.query.storeInventories.findFirst({
      where: (table) => eq(table.id, inventoryId),
    });

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
    const store = await this.db.query.stores.findFirst({
      columns: { id: true },
      where: (table) => and(eq(table.id, storeId), isNull(table.deletedAt)),
    });

    if (!store) {
      throwHttpError(HttpStatus.NOT_FOUND, "Store not found");
    }
  }

  private async assertProductExists(productId: number) {
    const product = await this.db.query.products.findFirst({
      columns: { id: true },
      where: (table) => and(eq(table.id, productId), isNull(table.deletedAt)),
    });

    if (!product) {
      throwHttpError(HttpStatus.BAD_REQUEST, "Product not found", "productId");
    }
  }
}
