import { Injectable } from "@nestjs/common";
import type { StockReason } from "../common/stock-reasons";
import { TXContext } from "../database/database.types";
import { StoreInventoryTransactionsRepository } from "./store-inventory-transactions.repository";

@Injectable()
export class StoreInventoryTransactionsService {
  constructor(
    private readonly storeInventoryTransactionsRepository: StoreInventoryTransactionsRepository,
  ) {}

  listByInventoryId(inventoryId: number) {
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
    inventoryId: number,
    change: number,
    reason: StockReason,
    reference: string,
    changedBy: number,
    txContext: TXContext,
  ) {
    await this.storeInventoryTransactionsRepository.create(
      inventoryId,
      change,
      reason,
      reference,
      changedBy,
      txContext,
    );
  }
}
