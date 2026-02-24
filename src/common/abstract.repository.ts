import type { Database, TXContext } from "../database/database.types";

export abstract class AbstractRepository {
  protected constructor(readonly db: Database) {}

  async transaction<T>(callback: (txContext: TXContext) => Promise<T>) {
    return this.db.transaction(async (tx) => callback(tx));
  }
}
