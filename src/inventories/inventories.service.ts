import { subject } from "@casl/ability";
import { HttpStatus, Injectable } from "@nestjs/common";
import { Action, CaslAbilityFactory } from "../auth/casl/index";
import type { AuthenticatedUser } from "../auth/interfaces/index";
import { throwHttpError } from "../common/http-error";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { RestockInventoryDto } from "./dto/restock-inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";
import { InventoriesRepository } from "./inventories.repository";
import { StoreInventoryTransactionsService } from "./store-inventory-transactions.service";

@Injectable()
export class InventoriesService {
  constructor(
    private readonly inventoriesRepository: InventoriesRepository,
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

    const created = await this.inventoriesRepository.create(
      storeId,
      user.id,
      dto,
    );

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

    const updated = await this.inventoriesRepository.restock(
      storeId,
      inventoryId,
      dto.qty,
    );

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

    return this.storeInventoryTransactionsService.listByInventoryId(
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
    tx: any,
    inventoryId: number,
    qty: number,
    reference: string,
    changedBy: number,
  ) {
    const result = await this.inventoriesRepository.consumeReservedStock(
      inventoryId,
      qty,
      tx,
    );

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
