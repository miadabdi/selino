import { Injectable } from "@nestjs/common";
import type { StockReason } from "../common/stock-reasons.js";
import { StoreInventoryTransactionsRepository } from "./store-inventory-transactions.repository.js";

@Injectable()
export class StoreInventoryTransactionsService {
  constructor(
    private readonly storeInventoryTransactionsRepository: StoreInventoryTransactionsRepository,
  ) {}

  async listByInventoryId(inventoryId: number) {
    return this.storeInventoryTransactionsRepository.listByInventoryId(
      inventoryId,
    );
  }

  async create(
    inventoryId: number,
    change: number,
    reason: StockReason,
    reference: string,
    changedBy: number,
  ) {
    await this.storeInventoryTransactionsRepository.create(
      inventoryId,
      change,
      reason,
      reference,
      changedBy,
    );
  }

  async createWithTx(
    tx: any,
    inventoryId: number,
    change: number,
    reason: StockReason,
    reference: string,
    changedBy: number,
  ) {
    await this.storeInventoryTransactionsRepository.create(
      inventoryId,
      change,
      reason,
      reference,
      changedBy,
      tx,
    );
  }
}
