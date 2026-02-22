import { Inject, Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import type { StockReason } from "../common/stock-reasons.js";
import { AbstractRepository } from "../common/abstract.repository.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database, DBContext } from "../database/database.types.js";
import { storeInventoryTransactions } from "../database/schema/index.js";

@Injectable()
export class StoreInventoryTransactionsRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  listByInventoryId(inventoryId: number, db: DBContext = this.db) {
    return db.query.storeInventoryTransactions.findMany({
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
    db: DBContext = this.db,
  ) {
    await db.insert(storeInventoryTransactions).values({
      storeInventoryId: inventoryId,
      change,
      reason,
      reference,
      changedBy,
    });
  }
}
