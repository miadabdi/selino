import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database, DBContext } from "../database/database.types.js";
import {
  files,
  type FileRecord,
  type NewFileRecord,
} from "../database/schema/index.js";

@Injectable()
export class FilesRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  async create(
    data: NewFileRecord,
    db: DBContext = this.db,
  ): Promise<FileRecord> {
    const [created] = await db.insert(files).values(data).returning();
    return created;
  }

  findActiveById(
    fileId: number,
    db: DBContext = this.db,
  ): Promise<FileRecord | undefined> {
    return db.query.files.findFirst({
      where: (table) => and(eq(table.id, fileId), isNull(table.deletedAt)),
    });
  }

  async markStatus(
    fileId: number,
    status: FileRecord["status"],
    db: DBContext = this.db,
  ): Promise<FileRecord> {
    const [updated] = await db
      .update(files)
      .set({ status })
      .where(eq(files.id, fileId))
      .returning();

    return updated;
  }

  async softDeleteById(fileId: number, db: DBContext = this.db): Promise<void> {
    await db
      .update(files)
      .set({ deletedAt: new Date() })
      .where(eq(files.id, fileId));
  }
}
