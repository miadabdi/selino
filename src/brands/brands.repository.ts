import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull } from "drizzle-orm";
import { AbstractRepository } from "../common/abstract.repository.js";
import { DATABASE } from "../database/database.constants.js";
import type { Database, DBContext } from "../database/database.types.js";
import { brands, type Brand, type NewBrand } from "../database/schema/index.js";

@Injectable()
export class BrandsRepository extends AbstractRepository {
  constructor(@Inject(DATABASE) db: Database) {
    super(db);
  }

  listActive(db: DBContext = this.db): Promise<Brand[]> {
    return db.query.brands.findMany({
      where: (table) => isNull(table.deletedAt),
      orderBy: (table) => [asc(table.name)],
    });
  }

  async create(data: NewBrand, db: DBContext = this.db): Promise<Brand> {
    const [created] = await db.insert(brands).values(data).returning();
    return created;
  }

  findActiveById(
    id: number,
    db: DBContext = this.db,
  ): Promise<Brand | undefined> {
    return db.query.brands.findFirst({
      where: (table) => and(eq(table.id, id), isNull(table.deletedAt)),
    });
  }

  async updateById(
    id: number,
    data: Partial<NewBrand>,
    db: DBContext = this.db,
  ): Promise<Brand> {
    const [updated] = await db
      .update(brands)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(brands.id, id))
      .returning();

    return updated;
  }
}
