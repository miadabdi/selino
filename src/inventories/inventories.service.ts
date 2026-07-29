import { HttpStatus, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { assertBusinessPermission } from "../auth/permissions";
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
    private readonly storeInventoryTransactionsRepository: StoreInventoryTransactionsRepository,
  ) {}

  async create(
    businessAccountId: number,
    user: AuthenticatedUser,
    dto: CreateInventoryDto,
  ) {
    assertBusinessPermission(
      user,
      businessAccountId,
      "seller.inventory.create",
    );
    await this.assertBusinessAccountExists(businessAccountId);
    await this.assertProductExists(dto.productId);

    const initialStock = dto.stock ?? 0;

    if (initialStock <= 0) {
      return this.inventoriesRepository.create(businessAccountId, user.id, dto);
    }

    return this.inventoriesRepository.transaction(async (tx) => {
      const created = await this.inventoriesRepository.create(
        businessAccountId,
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
    businessAccountId: number,
    inventoryId: number,
    user: AuthenticatedUser,
    dto: RestockInventoryDto,
  ) {
    assertBusinessPermission(
      user,
      businessAccountId,
      "seller.inventory.restock",
    );
    await this.assertInventory(businessAccountId, inventoryId);

    return this.inventoriesRepository.transaction(async (tx) => {
      const updated = await this.inventoriesRepository.restock(
        businessAccountId,
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

  async list(businessAccountId: number, user: AuthenticatedUser) {
    assertBusinessPermission(user, businessAccountId, "seller.inventory.read");
    await this.assertBusinessAccountExists(businessAccountId);

    const rows =
      await this.inventoriesRepository.listByBusinessAccountId(
        businessAccountId,
      );

    return rows;
  }

  async update(
    businessAccountId: number,
    inventoryId: number,
    user: AuthenticatedUser,
    dto: UpdateInventoryDto,
  ) {
    assertBusinessPermission(
      user,
      businessAccountId,
      "seller.inventory.update",
    );
    await this.assertInventory(businessAccountId, inventoryId);

    const updated = await this.inventoriesRepository.updateById(
      businessAccountId,
      inventoryId,
      dto,
    );

    return updated;
  }

  async listTransactions(
    businessAccountId: number,
    inventoryId: number,
    user: AuthenticatedUser,
  ) {
    assertBusinessPermission(
      user,
      businessAccountId,
      "seller.inventory.transactions.read",
    );
    await this.assertInventory(businessAccountId, inventoryId);

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

  async assertInventory(businessAccountId: number, inventoryId: number) {
    const inventory =
      await this.inventoriesRepository.findInventoryByBusinessAccountAndId(
        businessAccountId,
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

  private async assertBusinessAccountExists(businessAccountId: number) {
    const businessAccount =
      await this.inventoriesRepository.findActiveBusinessAccountById(
        businessAccountId,
      );

    if (!businessAccount) {
      throwHttpError(HttpStatus.NOT_FOUND, "Business account not found");
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
