import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import type { StockReason } from "../common/stock-reasons";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import { storeInventoryTransactions } from "../database/schema/index";

@Injectable()
export class StoreInventoryTransactionsRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  listByInventoryId(inventoryId: number, txContext: TXContext = this.db) {
    return txContext.query.storeInventoryTransactions.findMany({
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
    txContext: TXContext = this.db,
  ) {
    await txContext.insert(storeInventoryTransactions).values({
      storeInventoryId: inventoryId,
      change,
      reason,
      reference,
      changedBy,
    });
  }
}
