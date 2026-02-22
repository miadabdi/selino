import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import type { StockReason } from "../common/stock-reasons.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database } from "../database/database.types.js";
import { storeInventoryTransactions } from "../database/schema/index.js";

@Injectable()
export class StoreInventoryTransactionsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async listByInventoryId(inventoryId: number) {
    return this.db.query.storeInventoryTransactions.findMany({
      where: (table) => eq(table.storeInventoryId, inventoryId),
      orderBy: (table) => [asc(table.id)],
    });
  }

  async create(
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

  async createWithTx(
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
