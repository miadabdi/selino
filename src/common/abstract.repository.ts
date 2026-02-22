import type { Database, DBContext } from "../database/database.types";

export abstract class AbstractRepository {
  protected constructor(protected readonly db: Database) {}

  async transaction<T>(callback: (tx: DBContext) => Promise<T>) {
    return this.db.transaction(async (tx) => callback(tx));
  }
}
