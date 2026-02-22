import { subject } from "@casl/ability";
import { HttpStatus, Injectable } from "@nestjs/common";
import { Action, CaslAbilityFactory } from "../auth/casl/index";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { throwHttpError } from "../common/http-error";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { RestockInventoryDto } from "./dto/restock-inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";
import { InventoriesRepository } from "./inventories.repository";
import { StoreInventoryTransactionsRepository } from "./store-inventory-transactions.repository";

@Injectable()
export class InventoriesService {
  constructor(
    private readonly inventoriesRepository: InventoriesRepository,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    private readonly storeInventoryTransactionsRepository: StoreInventoryTransactionsRepository,
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

    const initialStock = dto.stock ?? 0;

    if (initialStock <= 0) {
      return this.inventoriesRepository.create(storeId, user.id, dto);
    }

    return this.inventoriesRepository.transaction(async (tx) => {
      const created = await this.inventoriesRepository.create(
        storeId,
        user.id,
        dto,
        tx,
      );

      await this.storeInventoryTransactionsRepository.create(
        created.id,
        initialStock,
        "restock",
        `inventory:${created.id}:create`,
        user.id,
        tx,
      );

      return created;
    });
  }

  async restock(
    storeId: number,
    inventoryId: number,
    user: AuthenticatedUser,
    dto: RestockInventoryDto,
  ) {
    this.assertInventoryCasl(user, Action.Update, storeId);
    await this.assertInventory(storeId, inventoryId);

    return this.inventoriesRepository.transaction(async (tx) => {
      const updated = await this.inventoriesRepository.restock(
        storeId,
        inventoryId,
        dto.qty,
        tx,
      );

      await this.storeInventoryTransactionsRepository.create(
        inventoryId,
        dto.qty,
        dto.reason,
        `inventory:${inventoryId}:restock`,
        user.id,
        tx,
      );

      return updated;
    });
  }

  async list(storeId: number) {
    await this.assertStoreExists(storeId);

    const rows = await this.inventoriesRepository.listByStoreId(storeId);

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

    const updated = await this.inventoriesRepository.updateById(
      storeId,
      inventoryId,
      dto,
    );

    return updated;
  }

  async listTransactions(storeId: number, inventoryId: number) {
    await this.assertInventory(storeId, inventoryId);

    return this.storeInventoryTransactionsRepository.listByInventoryId(
      inventoryId,
    );
  }

  async reserveStock(inventoryId: number, qty: number) {
    const result = await this.inventoriesRepository.reserveStock(
      inventoryId,
      qty,
    );

    if (result.length === 0) {
      throwHttpError(HttpStatus.CONFLICT, "Out of stock");
    }

    return result[0];
  }

  async releaseReservedStock(inventoryId: number, qty: number) {
    const result = await this.inventoriesRepository.releaseReservedStock(
      inventoryId,
      qty,
    );

    if (result.length === 0) {
      throwHttpError(HttpStatus.CONFLICT, "Stock reservation conflict");
    }

    return result[0];
  }

  async consumeReservedStockAtomic(
    inventoryId: number,
    qty: number,
    reference: string,
    changedBy: number,
  ) {
    return this.inventoriesRepository.transaction(async (tx) => {
      const result = await this.inventoriesRepository.consumeReservedStock(
        inventoryId,
        qty,
        tx,
      );

      if (result.length === 0) {
        throwHttpError(HttpStatus.CONFLICT, "Insufficient stock for sale");
      }

      await this.storeInventoryTransactionsRepository.create(
        inventoryId,
        -qty,
        "sale",
        reference,
        changedBy,
        tx,
      );

      return result[0];
    });
  }

  async assertInventory(storeId: number, inventoryId: number) {
    const inventory =
      await this.inventoriesRepository.findInventoryByStoreAndId(
        storeId,
        inventoryId,
      );

    if (!inventory) {
      throwHttpError(HttpStatus.NOT_FOUND, "Inventory not found");
    }

    return inventory;
  }

  async findInventoryById(inventoryId: number) {
    const inventory =
      await this.inventoriesRepository.findInventoryById(inventoryId);

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
    const store = await this.inventoriesRepository.findActiveStoreById(storeId);

    if (!store) {
      throwHttpError(HttpStatus.NOT_FOUND, "Store not found");
    }
  }

  private async assertProductExists(productId: number) {
    const product =
      await this.inventoriesRepository.findActiveProductById(productId);

    if (!product) {
      throwHttpError(HttpStatus.BAD_REQUEST, "Product not found", "productId");
    }
  }
}
