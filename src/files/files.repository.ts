import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository";
import { DATABASE } from "../database/database.constants";
import type { Database, TXContext } from "../database/database.types";
import {
  files,
  type FileRecord,
  type NewFileRecord,
} from "../database/schema/index";

@Injectable()
export class FilesRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async create(
    data: NewFileRecord,
    txContext: TXContext = this.db,
  ): Promise<FileRecord> {
    const [created] = await txContext.insert(files).values(data).returning();
    return created;
  }

  findActiveById(
    fileId: number,
    txContext: TXContext = this.db,
  ): Promise<FileRecord | undefined> {
    return txContext.query.files.findFirst({
      where: (table) => and(eq(table.id, fileId), isNull(table.deletedAt)),
    });
  }

  async markStatus(
    fileId: number,
    status: FileRecord["status"],
    txContext: TXContext = this.db,
  ): Promise<FileRecord> {
    const [updated] = await txContext
      .update(files)
      .set({ status })
      .where(eq(files.id, fileId))
      .returning();

    return updated;
  }

  async softDeleteById(
    fileId: number,
    txContext: TXContext = this.db,
  ): Promise<void> {
    await txContext
      .update(files)
      .set({ deletedAt: new Date() })
      .where(eq(files.id, fileId));
  }
}
